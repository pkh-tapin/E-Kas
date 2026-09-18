import { saveToFirebase, getFromFirebase, listenFirebase } from './firebase';

export { listenFirebase, saveToFirebase, getFromFirebase };

const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbyHqzptFyuY8httU97-HHdI6B-x_s283AOZnYaKxQjqwUdPHp1TUjAAaNR2SyQOMNoq/exec";

const DEFAULT_BENDAHARA_LIST = [
  { id: 1, nama: "Herni", status: "Aktif" },
  { id: 2, nama: "Sari", status: "Aktif" },
  { id: 3, nama: "Dina Riris Yanti", status: "Aktif" }
];

// Helper Format Tanggal Baku Indonesia: dd mmmm yyyy
export const formatDateIndo = (dateInput) => {
  if (!dateInput || dateInput === '-') return '-';
  let d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    const parts = String(dateInput).split('T')[0].split('-');
    if (parts.length === 3) {
      d = new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }
  if (isNaN(d.getTime())) return String(dateInput);

  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

export const parseTimestamp = (dateVal) => {
  if (!dateVal) return 0;
  let d = new Date(dateVal);
  if (!isNaN(d.getTime())) return d.getTime();
  const parts = String(dateVal).split('T')[0].split('-');
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
  }
  return 0;
};

// 1. SUBSCRIBE SETTINGS / PENGATURAN
export const subscribeSettings = (callback) => {
  return listenFirebase("pengaturan_cache", (data) => {
    if (data) {
      if (!data.bendaharaList || !Array.isArray(data.bendaharaList) || data.bendaharaList.length === 0) {
        data.bendaharaList = DEFAULT_BENDAHARA_LIST;
      }
      callback(data);
    } else {
      const defaultSettings = {
        asosiasi: {
          namaAsosiasi: 'Asosiasi SDM PKH Tapin',
          nominalIuran: 35000,
          targetTahunan: 300000,
          nominalMaksimalKlaim: 5000000,
          jumlahMaksimalKlaimTahunan: 1,
          jatuhTempoTanggal: 10,
          periodeAktif: '2026'
        },
        bendaharaList: DEFAULT_BENDAHARA_LIST,
        system: {
          spreadsheetId: '1PaPuwRheBA9OwfnCF0hV0zIRBwG_d5lyM8U1GS0OdWk',
          driveFolderId: '1KR82sPBoRg61cpjwRKZNzBDGQbYJG2e5',
          webAppUrl: DEFAULT_API_URL
        }
      };
      saveToFirebase("pengaturan_cache", defaultSettings);
      callback(defaultSettings);
    }
  });
};

export const saveSettingsToDatabase = async (newSettings) => {
  await saveToFirebase("pengaturan_cache", newSettings);
  return { success: true };
};

// 2. MIGRASI SPREADSHEET KE FIREBASE (MURNI DATA SPREADSHEET/UPLOAD)
export const migrateSpreadsheetToFirebase = async () => {
  try {
    const config = (await getFromFirebase("pengaturan_cache"))?.system;
    const apiUrl = config?.webAppUrl || DEFAULT_API_URL;

    const [dashRes, pegawaiRes, rekapRes] = await Promise.all([
      fetch(`${apiUrl}?action=getDashboardData`).then(r => r.json()).catch(() => null),
      fetch(`${apiUrl}?action=getPegawai`).then(r => r.json()).catch(() => null),
      fetch(`${apiUrl}?action=getRekapAsosiasi`).then(r => r.json()).catch(() => null)
    ]);

    if (dashRes && !dashRes.error && dashRes.totals) {
      await saveToFirebase("dashboard_cache", dashRes);
    }

    let cleanSDMList = [];
    if (Array.isArray(pegawaiRes) && pegawaiRes.length > 0) {
      cleanSDMList = pegawaiRes.map((p, idx) => {
        const rawName = typeof p === 'object' ? (p.nama || p[0]) : p;
        return {
          id: idx + 1,
          nik: p.nik || `${1000 + idx}`,
          nama: rawName ? String(rawName).trim() : '-',
          jabatan: p.jabatan || 'Pendamping Sosial',
          kecamatan: p.kecamatan || '-',
          status: p.status || 'Aktif'
        };
      });
    }

    await saveToFirebase("sdm_cache", cleanSDMList);

    if (Array.isArray(rekapRes)) {
      await saveToFirebase("rekap_pencairan_cache", rekapRes);
    }

    return { success: true };
  } catch (error) {
    console.error("Error Sync Spreadsheet -> Firebase:", error);
    return { success: false, error: error.message };
  }
};

let hasInitialSynced = false;

// 3. GET & SUBSCRIBE DASHBOARD DATA
export const getFastDashboardData = async (onUpdate) => {
  const cached = await getFromFirebase("dashboard_cache");
  if (cached && onUpdate) onUpdate(cached);
  return cached;
};

export const subscribeDashboardData = (callback) => {
  if (!hasInitialSynced) {
    hasInitialSynced = true;
    migrateSpreadsheetToFirebase();
  }

  return listenFirebase("dashboard_cache", (data) => {
    if (data) {
      callback(data);
    } else {
      migrateSpreadsheetToFirebase();
    }
  });
};

// 4. GET & SUBSCRIBE PEGAWAI / SDM
export const getFastPegawaiSDM = async (onUpdate) => {
  const cached = await getFromFirebase("sdm_cache");
  if (cached && onUpdate) onUpdate(cached);
  return cached || [];
};

export const getFastPegawai = getFastPegawaiSDM;

export const subscribeSDMData = (callback) => {
  return listenFirebase("sdm_cache", (data) => {
    if (Array.isArray(data)) {
      callback(data);
    } else {
      callback([]);
    }
  });
};

// 5. REKAP ASOSIASI / KLAIM PENCAIRAN
export const getFastRekapAsosiasi = async (onUpdate) => {
  const cached = await getFromFirebase("rekap_pencairan_cache");
  if (cached && onUpdate) onUpdate(cached);
  return cached || [];
};

export const subscribeRekapAsosiasi = (callback) => {
  return listenFirebase("rekap_pencairan_cache", (data) => {
    if (Array.isArray(data)) {
      callback(data);
    } else {
      callback([]);
    }
  });
};

export const saveRekapAsosiasiToDatabase = async (newList, newRecord = null) => {
  await saveToFirebase("rekap_pencairan_cache", newList);

  const sysConfig = (await getFromFirebase("pengaturan_cache"))?.system;
  const apiUrl = sysConfig?.webAppUrl || DEFAULT_API_URL;

  if (newRecord) {
    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "simpanRekapAsosiasi", payload: newRecord }),
    }).catch(console.error);
  }
};

export const saveSDMToDatabase = async (newList) => {
  await saveToFirebase("sdm_cache", newList);

  const sysConfig = (await getFromFirebase("pengaturan_cache"))?.system;
  const apiUrl = sysConfig?.webAppUrl || DEFAULT_API_URL;

  fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "syncSDM", payload: newList }),
  }).catch(console.error);
};

// 6. API FETCH & MUTASI TRANSAKSI
export const fetchAPI = async (action, payload = null) => {
  try {
    const sysConfig = (await getFromFirebase("pengaturan_cache"))?.system;
    const apiUrl = sysConfig?.webAppUrl || DEFAULT_API_URL;

    const autoID = `D-${Date.now()}`;
    const tglRaw = payload?.tanggal || new Date().toISOString().split('T')[0];
    const tglFormatted = formatDateIndo(tglRaw);
    const rawTime = parseTimestamp(tglRaw);

    if (action === 'simpanDana' && payload) {
      const currentDash = (await getFromFirebase("dashboard_cache")) || {
        totals: { masuk: 0, keluar: 0, iuran: 0, herni: 0, sari: 0, dina: 0 },
        dashboardIn: [],
        dashboardOut: [],
        fullIn: [],
        fullOut: []
      };

      const nom = Number(payload.nominal || 0);
      const isMasuk = payload.jenis === 'Pemasukan';
      const kepStr = payload.nama_barang || payload.keperluan || '-';

      const rowFormat = [
        autoID,
        tglFormatted,
        payload.jenis,
        payload.kategori || 'Kantor',
        kepStr,
        1,
        nom,
        '-',
        payload.bendahara || 'Herni',
        rawTime
      ];

      const dashRowFormat = [
        tglFormatted,
        payload.kategori || 'Kantor',
        kepStr,
        nom,
        rawTime
      ];

      if (isMasuk) {
        currentDash.totals.masuk = (currentDash.totals.masuk || 0) + nom;
        currentDash.fullIn = [rowFormat, ...(currentDash.fullIn || [])];
        currentDash.dashboardIn = [dashRowFormat, ...(currentDash.dashboardIn || [])];
      } else {
        currentDash.totals.keluar = (currentDash.totals.keluar || 0) + nom;
        currentDash.fullOut = [rowFormat, ...(currentDash.fullOut || [])];
        currentDash.dashboardOut = [dashRowFormat, ...(currentDash.dashboardOut || [])];
      }

      const bName = (payload.bendahara || '').toLowerCase();
      if (bName.includes('herni')) {
        currentDash.totals.herni = isMasuk ? (currentDash.totals.herni || 0) + nom : (currentDash.totals.herni || 0) - nom;
      } else if (bName.includes('sari')) {
        currentDash.totals.sari = isMasuk ? (currentDash.totals.sari || 0) + nom : (currentDash.totals.sari || 0) - nom;
      } else if (bName.includes('dina') || bName.includes('riris')) {
        currentDash.totals.dina = isMasuk ? (currentDash.totals.dina || 0) + nom : (currentDash.totals.dina || 0) - nom;
      }

      await saveToFirebase("dashboard_cache", currentDash);
    }

    if (action === 'simpanIuran' && payload) {
      const currentDash = (await getFromFirebase("dashboard_cache")) || {
        totals: { masuk: 0, keluar: 0, iuran: 0 },
        statusIuran: [],
        fullIn: [],
        dashboardIn: []
      };

      const asoConfig = (await getFromFirebase("pengaturan_cache"))?.asosiasi;
      const targetTahun = asoConfig?.targetTahunan || 300000;
      const nom = Number(payload.nominal || 0);
      const kepStr = `Penyetoran Iuran a.n: ${payload.nama}`;

      currentDash.totals.iuran = (currentDash.totals.iuran || 0) + nom;

      if (Array.isArray(currentDash.statusIuran)) {
        currentDash.statusIuran = currentDash.statusIuran.map(item => {
          if (item.nama === payload.nama) {
            const currentSisa = item.sisa !== undefined ? Number(item.sisa) : targetTahun;
            const newSisa = Math.max(0, currentSisa - nom);
            return {
              ...item,
              sisa: newSisa,
              status: newSisa <= 0 ? 'Lunas' : 'Belum Lunas'
            };
          }
          return item;
        });
      }

      const rowFormat = [
        autoID,
        tglFormatted,
        'Pemasukan',
        'Iuran',
        kepStr,
        1,
        nom,
        '-',
        payload.bendahara || 'Herni',
        rawTime
      ];
      const dashRowFormat = [tglFormatted, 'Iuran', kepStr, nom, rawTime];

      currentDash.fullIn = [rowFormat, ...(currentDash.fullIn || [])];
      currentDash.dashboardIn = [dashRowFormat, ...(currentDash.dashboardIn || [])];

      await saveToFirebase("dashboard_cache", currentDash);
    }

    const options = payload
      ? {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action, payload: { ...payload, id: autoID } }),
        }
      : { method: "GET" };

    fetch(`${apiUrl}?action=${action}`, options)
      .then(r => r.json())
      .then(freshData => {
        if (freshData && freshData.totals) {
          saveToFirebase("dashboard_cache", freshData);
        }
      })
      .catch(console.error);

    return { status: "success" };
  } catch (error) {
    console.error(`API Fetch Error [${action}]:`, error);
    throw error;
  }
};