import { useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Power, RotateCcw } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import {
  ingredientApi,
  ingredientCategoryApi,
  unitApi,
  supplierApi,
  stockImportApi,
} from '../../services/inventoryApi';
import { useAuthStore } from '../../stores/authStore';
import { errorMessage } from '../../services/api';
import { formatVnd, formatQty, formatDate } from '../../utils/fmt';

// Nhãn nhóm hiển thị y hệt mockup, xếp đúng thứ tự mockup. Map từ tên nhóm trong DB.
const CATEGORY_LABEL = {
  'Cà phê': 'Coffee',
  Bột: 'Powder',
  Trà: 'Tea',
  'Chất tạo ngọt': 'Sweet',
  Sữa: 'Milk & Rượu',
  Siro: 'Syrup',
  'Tự làm tại quán': 'Homemade',
  Topping: 'Topping',
  'Vệ sinh': 'Cleaning',
  'Đồ rót / pha chế': 'Pour <3',
};
const CATEGORY_SORT = Object.keys(CATEGORY_LABEL);
const catLabel = (name) => CATEGORY_LABEL[name] || name;
const catRank = (name) => {
  const i = CATEGORY_SORT.indexOf(name);
  return i < 0 ? 999 : i;
};

const blankIng = () => ({
  id: null,
  name: '',
  categoryId: '',
  unitId: '',
  lowStockThreshold: '',
  costPrice: '',
  hasYield: false,
  yieldUnitId: '',
  yieldQuantity: '',
});
const blankSup = () => ({ id: null, name: '', phone: '', note: '' });
const blankImp = () => ({
  ingredientId: '',
  supplierId: '',
  quantity: '',
  unitCost: '',
  batchCode: '',
  expiryDate: '',
  note: '',
});

/**
 * Kho nguyên liệu. Bám `design/kho_nguyen_lieu_mockup_desktop`. Ba tab: Tồn kho
 * (STAFF xem được, không thấy giá vốn/thao tác), Nhập kho và Nhà cung cấp (ADMIN).
 *
 * <p>Khác mockup vài chỗ do backend: đơn vị lưu kho / đơn vị thành phẩm là select
 * (FK bảng units) chứ không nhập tay; phiếu nhập theo đúng đơn vị lưu kho của
 * nguyên liệu (mockup không có ô chọn đơn vị nhập). Nút "Xem như Admin/Staff"
 * của mockup là công cụ xem thử — bỏ, dùng vai trò thật của người đăng nhập.
 */
export default function WarehousePage() {
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const roleClass = isAdmin ? 'admin' : 'staff';

  const [tab, setTab] = useState('stock');
  const [search, setSearch] = useState('');
  const [fCat, setFCat] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState(null); // {type:'ingredient'|'supplier'|'status', target}
  const [ingForm, setIngForm] = useState(blankIng());
  const [supForm, setSupForm] = useState(blankSup());
  const [impForm, setImpForm] = useState(blankImp());
  const [fImportIng, setFImportIng] = useState('');

  const [ingredientsQuery, categoriesQuery, unitsQuery, suppliersQuery] = useQueries({
    queries: [
      {
        queryKey: ['ingredients', 'warehouse'],
        queryFn: () => ingredientApi.list({ size: 500, includeInactive: true }),
      },
      { queryKey: ['ingredient-categories'], queryFn: ingredientCategoryApi.list },
      { queryKey: ['units'], queryFn: unitApi.list },
      { queryKey: ['suppliers'], queryFn: () => supplierApi.list({ includeInactive: true }) },
    ],
  });
  const ingredients = useMemo(
    () => ingredientsQuery.data?.items ?? [],
    [ingredientsQuery.data],
  );
  const categories = useMemo(
    () => [...(categoriesQuery.data ?? [])].sort((a, b) => catRank(a.name) - catRank(b.name)),
    [categoriesQuery.data],
  );
  const units = unitsQuery.data ?? [];
  const suppliers = useMemo(() => suppliersQuery.data?.items ?? [], [suppliersQuery.data]);

  const importsQuery = useQuery({
    queryKey: ['stock-imports', fImportIng],
    queryFn: () =>
      stockImportApi.list({ size: 50, ingredientId: fImportIng || undefined }),
    enabled: tab === 'import',
  });
  const imports = importsQuery.data?.items ?? [];

  const activeIngredients = ingredients.filter((i) => i.active);
  const kpi = {
    total: activeIngredients.length,
    low: activeIngredients.filter((i) => Number(i.stockQty) < Number(i.lowStockThreshold)).length,
    value: activeIngredients.reduce(
      (s, i) => s + Number(i.stockQty) * Number(i.costPrice || 0),
      0,
    ),
  };

  // Gom nguyên liệu theo nhóm, xếp + đặt tên theo mockup.
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map();
    for (const it of ingredients) {
      if (!showInactive && !it.active) continue;
      if (fCat && it.categoryId !== fCat) continue;
      if (q && !it.name.toLowerCase().includes(q)) continue;
      if (!map.has(it.categoryName)) map.set(it.categoryName, []);
      map.get(it.categoryName).push(it);
    }
    return [...map.entries()]
      .sort((a, b) => catRank(a[0]) - catRank(b[0]))
      .map(([name, items]) => ({ name: catLabel(name), items }));
  }, [ingredients, showInactive, fCat, search]);

  const tabs = [['stock', 'Tồn kho'], ...(isAdmin ? [['import', 'Nhập kho'], ['supplier', 'Nhà cung cấp']] : [])];

  const closeModal = () => setModal(null);
  const afterSave = (keys) => {
    keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    closeModal();
  };

  const ingMut = useMutation({
    mutationFn: () => {
      const body = {
        categoryId: ingForm.categoryId,
        unitId: ingForm.unitId,
        name: ingForm.name.trim(),
        lowStockThreshold: Number(ingForm.lowStockThreshold) || 0,
        costPrice: ingForm.costPrice === '' ? 0 : Number(ingForm.costPrice),
        yieldUnitId: ingForm.hasYield ? ingForm.yieldUnitId || null : null,
        yieldQuantity: ingForm.hasYield ? Number(ingForm.yieldQuantity) || null : null,
      };
      return ingForm.id
        ? ingredientApi.update(ingForm.id, body)
        : ingredientApi.create(body);
    },
    onSuccess: () => afterSave(['ingredients']),
  });
  const supMut = useMutation({
    mutationFn: () => {
      const body = { name: supForm.name.trim(), phone: supForm.phone || null, note: supForm.note || null };
      return supForm.id ? supplierApi.update(supForm.id, body) : supplierApi.create(body);
    },
    onSuccess: () => afterSave(['suppliers']),
  });
  const statusMut = useMutation({
    mutationFn: () => {
      const { target } = modal;
      const fn = target.active ? ingredientApi.deactivate : ingredientApi.activate;
      return fn(target.id);
    },
    onSuccess: () => afterSave(['ingredients']),
  });
  const supStatusMut = useMutation({
    mutationFn: (s) => (s.active ? supplierApi.deactivate(s.id) : supplierApi.activate(s.id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
  const importMut = useMutation({
    mutationFn: () => {
      const ing = ingredients.find((i) => i.id === impForm.ingredientId);
      return stockImportApi.create({
        ingredientId: impForm.ingredientId,
        supplierId: impForm.supplierId || null,
        unitId: ing.unitId,
        batchCode: impForm.batchCode || null,
        quantity: Number(impForm.quantity),
        unitCost: impForm.unitCost === '' ? 0 : Number(impForm.unitCost),
        expiryDate: impForm.expiryDate || null,
        note: impForm.note || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['stock-imports'] });
      setImpForm(blankImp());
    },
  });

  const openIngredient = (it) => {
    ingMut.reset();
    setIngForm(
      it
        ? {
            id: it.id,
            name: it.name,
            categoryId: it.categoryId,
            unitId: it.unitId,
            lowStockThreshold: String(it.lowStockThreshold ?? ''),
            costPrice: it.costPrice == null ? '' : String(it.costPrice),
            hasYield: it.yieldQuantity != null,
            yieldUnitId: it.yieldUnitId ?? '',
            yieldQuantity: it.yieldQuantity == null ? '' : String(it.yieldQuantity),
          }
        : { ...blankIng(), categoryId: categories[0]?.id ?? '', unitId: units[0]?.id ?? '' },
    );
    setModal({ type: 'ingredient' });
  };
  const openSupplier = (s) => {
    supMut.reset();
    setSupForm(s ? { id: s.id, name: s.name, phone: s.phone ?? '', note: s.note ?? '' } : blankSup());
    setModal({ type: 'supplier' });
  };

  const impIng = ingredients.find((i) => i.id === impForm.ingredientId);
  const impTotal = (Number(impForm.quantity) || 0) * (Number(impForm.unitCost) || 0);

  return (
    <AppShell>
      <div className="flex flex-col px-7 pb-7 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl italic text-ink-deep">Kho nguyên liệu</h1>
            <p className="mt-0.5 text-[12.5px] text-olive">
              {kpi.total} nguyên liệu · {kpi.low} sắp hết
            </p>
          </div>
          {isAdmin && (
            <button className="btn-primary" onClick={() => openIngredient(null)}>
              <Plus strokeWidth={2} />
              Thêm nguyên liệu
            </button>
          )}
        </div>

        <div className="cat-tabs mt-4">
          {tabs.map(([k, label]) => (
            <button
              key={k}
              className={`cat-tab${tab === k ? ' active' : ''}`}
              onClick={() => setTab(k)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* TAB: TỒN KHO */}
        {tab === 'stock' && (
          <div className="mt-4">
            <div className="kpi-grid mb-4" style={{ gridTemplateColumns: `repeat(${isAdmin ? 3 : 2}, 1fr)` }}>
              <div className="kpi-card">
                <div className="kpi-label">Tổng nguyên liệu</div>
                <div className="kpi-value">{kpi.total}</div>
              </div>
              <div className="kpi-card warn">
                <div className="kpi-label">Sắp hết hàng</div>
                <div className="kpi-value">{kpi.low}</div>
              </div>
              {isAdmin && (
                <div className="kpi-card">
                  <div className="kpi-label">Giá trị tồn kho</div>
                  <div className="kpi-value">{(kpi.value / 1e6).toFixed(1)}tr</div>
                </div>
              )}
            </div>

            <div className="toolbar-row">
              <div className="search-wrap">
                <Search />
                <input
                  placeholder="Tìm nguyên liệu..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select className="nv-select" value={fCat} onChange={(e) => setFCat(e.target.value)}>
                <option value="">Tất cả nhóm</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {catLabel(c.name)}
                  </option>
                ))}
              </select>
              {isAdmin && (
                <label className="toggle-inline" onClick={() => setShowInactive((v) => !v)}>
                  <span className={`toggle-track${showInactive ? ' on' : ''}`}>
                    <span className="toggle-knob" />
                  </span>
                  Hiện cả nguyên liệu đã ngừng dùng
                </label>
              )}
            </div>

            {ingredientsQuery.isLoading && <p className="text-[12.5px] text-olive">Đang tải…</p>}
            {!ingredientsQuery.isLoading && groups.length === 0 && (
              <p className="text-[12.5px] text-olive">Không có nguyên liệu nào khớp.</p>
            )}
            {groups.map((g) => (
              <div key={g.name} className="category-box">
                <div className="category-head">
                  <span className="category-name">{g.name}</span>
                  <span className="category-count">{g.items.length} mục</span>
                </div>
                <div className={`ing-head-row ${roleClass}`}>
                  <div className="ing-head-cell">Tên nguyên liệu</div>
                  <div className="ing-head-cell">Tồn kho</div>
                  <div className="ing-head-cell">Ngưỡng</div>
                  <div className="ing-head-cell">Trạng thái</div>
                  {isAdmin && <div className="ing-head-cell">Giá vốn</div>}
                  {isAdmin && <div className="ing-head-cell" />}
                </div>
                {g.items.map((it) => {
                  const low = it.active && Number(it.stockQty) < Number(it.lowStockThreshold);
                  return (
                    <div key={it.id} className={`ing-row ${roleClass}`}>
                      <div className="ing-name-cell">
                        <span className="ing-name">{it.name}</span>
                        {it.yieldQuantity != null && (
                          <span className="ing-yield-note">
                            Yield: {formatQty(it.yieldQuantity)} {it.yieldUnitCode} / {it.unitCode}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="ing-stock">{formatQty(it.stockQty)}</span>{' '}
                        <span className="ing-unit">{it.unitCode}</span>
                      </div>
                      <div className="ing-threshold">
                        Ngưỡng: {formatQty(it.lowStockThreshold)} {it.unitCode}
                      </div>
                      <div>
                        {!it.active ? (
                          <span className="badge inactive">Ngừng dùng</span>
                        ) : low ? (
                          <span className="badge low">Sắp hết</span>
                        ) : (
                          <span className="badge ok">Đủ hàng</span>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="ing-cost">
                          {it.costPrice == null ? '—' : formatVnd(it.costPrice)}
                        </div>
                      )}
                      {isAdmin && (
                        <div className="row-actions">
                          <button className="icon-btn" title="Sửa" onClick={() => openIngredient(it)}>
                            <Pencil />
                          </button>
                          <button
                            className="icon-btn"
                            title={it.active ? 'Ngừng dùng' : 'Dùng lại'}
                            onClick={() => {
                              statusMut.reset();
                              setModal({ type: 'status', target: it });
                            }}
                          >
                            {it.active ? <Power /> : <RotateCcw />}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* TAB: NHẬP KHO */}
        {tab === 'import' && isAdmin && (
          <div className="mt-4">
            <div className="category-box" style={{ padding: '18px 20px', marginBottom: 16 }}>
              <div className="text-[13.5px] font-bold text-ink-deep">Lập phiếu nhập kho</div>
              <div className="mb-3.5 text-[11.5px] text-olive">
                Số lượng sẽ được cộng thẳng vào tồn kho sau khi lưu
              </div>
              <div className="import-form">
                <div className="form-field">
                  <label className="form-label">Nguyên liệu</label>
                  <select
                    className="form-select"
                    value={impForm.ingredientId}
                    onChange={(e) => setImpForm((f) => ({ ...f, ingredientId: e.target.value }))}
                  >
                    <option value="">— Chọn nguyên liệu —</option>
                    {activeIngredients.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.unitCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Nhà cung cấp</label>
                  <select
                    className="form-select"
                    value={impForm.supplierId}
                    onChange={(e) => setImpForm((f) => ({ ...f, supplierId: e.target.value }))}
                  >
                    <option value="">— Không chọn —</option>
                    {suppliers.filter((s) => s.active).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Số lượng {impIng ? `(${impIng.unitCode})` : ''}</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="0"
                    value={impForm.quantity}
                    onChange={(e) => setImpForm((f) => ({ ...f, quantity: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Đơn giá (đ)</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="0"
                    value={impForm.unitCost}
                    onChange={(e) => setImpForm((f) => ({ ...f, unitCost: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Mã lô</label>
                  <input
                    className="form-input"
                    placeholder="vd: AR-2607"
                    value={impForm.batchCode}
                    onChange={(e) => setImpForm((f) => ({ ...f, batchCode: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Hạn dùng</label>
                  <input
                    className="form-input"
                    type="date"
                    value={impForm.expiryDate}
                    onChange={(e) => setImpForm((f) => ({ ...f, expiryDate: e.target.value }))}
                  />
                </div>
                <div className="form-field" style={{ gridColumn: '1/3' }}>
                  <label className="form-label">Ghi chú</label>
                  <input
                    className="form-input"
                    placeholder="Không bắt buộc"
                    value={impForm.note}
                    onChange={(e) => setImpForm((f) => ({ ...f, note: e.target.value }))}
                  />
                </div>
                <div className="import-total">
                  <span className="import-total-label">Thành tiền</span>
                  <span className="import-total-value">{formatVnd(impTotal)}</span>
                </div>
              </div>
              {importMut.isError && (
                <p className="mt-2 text-[12px] text-wine">{errorMessage(importMut.error)}</p>
              )}
              <button
                className="btn-primary mt-3.5 w-full justify-center"
                disabled={!impForm.ingredientId || !impForm.quantity || importMut.isPending}
                onClick={() => importMut.mutate()}
              >
                {importMut.isPending ? 'Đang lưu…' : 'Lưu phiếu nhập'}
              </button>
            </div>

            <div className="mb-2 text-[13.5px] font-bold text-ink-deep">Lịch sử nhập kho</div>
            <div className="toolbar-row" style={{ marginBottom: 10 }}>
              <select
                className="nv-select"
                value={fImportIng}
                onChange={(e) => setFImportIng(e.target.value)}
              >
                <option value="">Tất cả nguyên liệu</option>
                {ingredients.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="category-box">
              <table className="hist-table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Nguyên liệu</th>
                    <th>Lô</th>
                    <th>SL</th>
                    <th>Đơn giá</th>
                    <th>NCC</th>
                    <th>Người nhập</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((r) => (
                    <tr key={r.id}>
                      <td>{formatDate(r.importedAt)}</td>
                      <td>{r.ingredientName}</td>
                      <td>{r.batchCode || '—'}</td>
                      <td>
                        {formatQty(r.quantity)} {r.unitCode}
                      </td>
                      <td>{formatVnd(r.unitCost)}</td>
                      <td>{r.supplierName || '—'}</td>
                      <td>{r.importedByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!importsQuery.isLoading && imports.length === 0 && (
                <p className="p-4 text-[12.5px] text-olive">Chưa có phiếu nhập nào.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB: NHÀ CUNG CẤP */}
        {tab === 'supplier' && isAdmin && (
          <div className="mt-4">
            <div className="mb-3 flex justify-end">
              <button className="btn-primary" onClick={() => openSupplier(null)}>
                <Plus strokeWidth={2} />
                Thêm nhà cung cấp
              </button>
            </div>
            <div className="category-box">
              {suppliers.map((s) => (
                <div key={s.id} className="supplier-card">
                  <div className="supplier-avatar">{s.name.slice(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div className="supplier-name">
                      {s.name}
                      {!s.active && <span className="badge inactive" style={{ marginLeft: 8 }}>Ngừng dùng</span>}
                    </div>
                    <div className="supplier-meta">
                      {s.phone || 'chưa có SĐT'}
                      {s.note ? ` · ${s.note}` : ''}
                    </div>
                  </div>
                  <div className="row-actions">
                    <button className="icon-btn" title="Sửa" onClick={() => openSupplier(s)}>
                      <Pencil />
                    </button>
                    <button
                      className="icon-btn"
                      title={s.active ? 'Ngừng dùng' : 'Dùng lại'}
                      onClick={() => supStatusMut.mutate(s)}
                    >
                      {s.active ? <Power /> : <RotateCcw />}
                    </button>
                  </div>
                </div>
              ))}
              {suppliers.length === 0 && (
                <p className="p-4 text-[12.5px] text-olive">Chưa có nhà cung cấp nào.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Thêm/Sửa nguyên liệu */}
      {modal?.type === 'ingredient' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '88vh', overflowY: 'auto' }}>
            <div className="modal-title">{ingForm.id ? 'Sửa nguyên liệu' : 'Thêm nguyên liệu'}</div>
            {!ingForm.id && (
              <div className="modal-hint">Tồn kho bắt đầu ở mức 0 — nhập kho để cộng số lượng vào</div>
            )}
            <div className="form-field">
              <label className="form-label">Tên nguyên liệu</label>
              <input
                className="form-input"
                value={ingForm.name}
                autoFocus
                onChange={(e) => setIngForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-field" style={{ marginTop: 10 }}>
              <label className="form-label">Nhóm</label>
              <select
                className="form-select"
                value={ingForm.categoryId}
                onChange={(e) => setIngForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {catLabel(c.name)}
                  </option>
                ))}
              </select>
            </div>
            <div className="import-form" style={{ marginTop: 10 }}>
              <div className="form-field">
                <label className="form-label">Đơn vị lưu kho</label>
                <select
                  className="form-select"
                  value={ingForm.unitId}
                  onChange={(e) => setIngForm((f) => ({ ...f, unitId: e.target.value }))}
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Ngưỡng cảnh báo</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="vd: 500"
                  value={ingForm.lowStockThreshold}
                  onChange={(e) => setIngForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-field" style={{ marginTop: 10 }}>
              <label className="form-label">Giá vốn / đơn vị (đ)</label>
              <input
                className="form-input"
                type="number"
                placeholder="Chỉ Admin thấy mục này"
                value={ingForm.costPrice}
                onChange={(e) => setIngForm((f) => ({ ...f, costPrice: e.target.value }))}
              />
            </div>
            <div className="checkbox-row">
              <input
                type="checkbox"
                id="ingHasYield"
                checked={ingForm.hasYield}
                onChange={(e) => setIngForm((f) => ({ ...f, hasYield: e.target.checked }))}
              />
              <label htmlFor="ingHasYield">
                Có thành phẩm pha chế (vd: trà ủ, cold brew, siro)
              </label>
            </div>
            {ingForm.hasYield && (
              <div className="yield-box">
                <div className="modal-hint" style={{ marginBottom: 8 }}>
                  1 đơn vị lưu kho pha ra bao nhiêu đơn vị thành phẩm — đơn vị thành phẩm phải khác
                  hệ đo với đơn vị lưu kho.
                </div>
                <div className="import-form">
                  <div className="form-field">
                    <label className="form-label">Đơn vị thành phẩm</label>
                    <select
                      className="form-select"
                      value={ingForm.yieldUnitId}
                      onChange={(e) => setIngForm((f) => ({ ...f, yieldUnitId: e.target.value }))}
                    >
                      <option value="">— Chọn đơn vị —</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Số lượng thành phẩm / 1 đơn vị lưu kho</label>
                    <input
                      className="form-input"
                      type="number"
                      placeholder="vd: 4"
                      value={ingForm.yieldQuantity}
                      onChange={(e) => setIngForm((f) => ({ ...f, yieldQuantity: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}
            {ingMut.isError && (
              <p className="text-[12px] text-wine">{errorMessage(ingMut.error)}</p>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal}>
                Huỷ
              </button>
              <button
                className="btn-confirm"
                disabled={!ingForm.name.trim() || !ingForm.categoryId || !ingForm.unitId || ingMut.isPending}
                onClick={() => ingMut.mutate()}
              >
                {ingMut.isPending ? 'Đang lưu…' : 'Lưu nguyên liệu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Thêm/Sửa nhà cung cấp */}
      {modal?.type === 'supplier' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{supForm.id ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}</div>
            <div className="form-field">
              <label className="form-label">Tên nhà cung cấp</label>
              <input
                className="form-input"
                value={supForm.name}
                autoFocus
                onChange={(e) => setSupForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-field" style={{ marginTop: 10 }}>
              <label className="form-label">Số điện thoại</label>
              <input
                className="form-input"
                value={supForm.phone}
                onChange={(e) => setSupForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="form-field" style={{ marginTop: 10 }}>
              <label className="form-label">Ghi chú</label>
              <input
                className="form-input"
                placeholder="vd: chuyên cà phê Arabica"
                value={supForm.note}
                onChange={(e) => setSupForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
            {supMut.isError && (
              <p className="text-[12px] text-wine">{errorMessage(supMut.error)}</p>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal}>
                Huỷ
              </button>
              <button
                className="btn-confirm"
                disabled={!supForm.name.trim() || supMut.isPending}
                onClick={() => supMut.mutate()}
              >
                {supMut.isPending ? 'Đang lưu…' : 'Lưu nhà cung cấp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ngừng dùng / dùng lại nguyên liệu */}
      {modal?.type === 'status' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              {modal.target.active ? 'Ngừng dùng: ' : 'Dùng lại: '}
              {modal.target.name}
            </div>
            <div className="modal-hint">
              {modal.target.active
                ? 'Không xoá dữ liệu — chỉ ẩn khỏi form Menu/Nhập kho mới, lịch sử vẫn giữ nguyên.'
                : 'Nguyên liệu sẽ xuất hiện lại trong các form chọn nguyên liệu mới.'}
            </div>
            {statusMut.isError && (
              <p className="text-[12px] text-wine">{errorMessage(statusMut.error)}</p>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal}>
                Huỷ
              </button>
              <button
                className={`btn-confirm${modal.target.active ? ' danger' : ''}`}
                disabled={statusMut.isPending}
                onClick={() => statusMut.mutate()}
              >
                {modal.target.active ? 'Xác nhận ngừng dùng' : 'Xác nhận dùng lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
