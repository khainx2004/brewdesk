/**
 * Logic dùng chung cho phiên test QC — bản desktop (`QcPage`) và bản mobile
 * (`MobileQcPage`) đều nhập từ đây để không lệch validate/payload giữa hai màn.
 */

export const FAIL_LABEL = {
  NOTIFY_MANAGER: 'Báo quản lý',
  STOP_BATCH: 'Ngừng dùng lô',
  RETEST: 'Pha lại',
};

export function blankEntry() {
  return {
    key: crypto.randomUUID(),
    stockImportId: '',
    doseGram: '',
    yieldGram: '',
    extractionSeconds: '',
    grindSetting: '',
    boilerTempC: '',
    humidityPercent: '',
    acidity: 0,
    body: 0,
    sweetness: 0,
    note: '',
    passed: null,
    failAction: '',
  };
}

/** Chuyển ô rỗng thành null, số thành Number — đúng dạng backend nhận. */
export function toPayload(e) {
  const num = (v) => (v === '' || v == null ? null : Number(v));
  return {
    stockImportId: e.stockImportId || null,
    doseGram: num(e.doseGram),
    yieldGram: num(e.yieldGram),
    extractionSeconds: num(e.extractionSeconds),
    grindSetting: e.grindSetting.trim() || null,
    boilerTempC: num(e.boilerTempC),
    humidityPercent: num(e.humidityPercent),
    acidity: e.acidity || null,
    body: e.body || null,
    sweetness: e.sweetness || null,
    passed: e.passed,
    failAction: e.passed === false ? e.failAction || null : null,
    note: e.note.trim() || null,
  };
}

/** Lý do không cho lưu, hoặc null nếu hợp lệ. Chặn ở client cho khớp backend. */
export function validate(entries) {
  if (entries.length === 0) return 'Chưa có lần test nào';
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const n = i + 1;
    if (!e.acidity || !e.body || !e.sweetness)
      return `Lần ${n}: chưa chấm đủ điểm chua / đậm / ngọt`;
    if (e.passed === null) return `Lần ${n}: chưa chọn đạt hay không đạt`;
    if (e.passed === false && !e.failAction)
      return `Lần ${n}: không đạt thì phải chọn hành động xử lý`;
  }
  return null;
}
