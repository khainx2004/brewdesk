import { useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Pencil, Plus, Power, RotateCcw, Search } from 'lucide-react';
import MobileTabBar from '../../components/layout/MobileTabBar';
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

// Nhãn nhóm + thứ tự y hệt bản desktop (WarehousePage), map từ tên nhóm trong DB.
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
 * Màn mobile "Kho quản lý" — suy ra từ `WarehousePage` desktop. Ba tab: Tồn kho
 * (STAFF xem, không thấy giá vốn/thao tác), Nhập kho và Nhà cung cấp (ADMIN).
 * Danh sách chuyển sang dạng thẻ một cột; các modal thêm/sửa dùng lại class
 * `modal-*`/`form-*` toàn cục như bản desktop (không thêm backend).
 */
export default function MobileWarehousePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');

  const [tab, setTab] = useState('stock');
  const [search, setSearch] = useState('');
  const [fCat, setFCat] = useState('');
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
    queryFn: () => stockImportApi.list({ size: 50, ingredientId: fImportIng || undefined }),
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

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map();
    for (const it of ingredients) {
      if (!it.active) continue;
      if (fCat && it.categoryId !== fCat) continue;
      if (q && !it.name.toLowerCase().includes(q)) continue;
      if (!map.has(it.categoryName)) map.set(it.categoryName, []);
      map.get(it.categoryName).push(it);
    }
    return [...map.entries()]
      .sort((a, b) => catRank(a[0]) - catRank(b[0]))
      .map(([name, items]) => ({ name: catLabel(name), items }));
  }, [ingredients, fCat, search]);

  const tabs = [
    ['stock', 'Tồn kho'],
    ...(isAdmin ? [['import', 'Nhập kho'], ['supplier', 'Nhà cung cấp']] : []),
  ];

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
      return ingForm.id ? ingredientApi.update(ingForm.id, body) : ingredientApi.create(body);
    },
    onSuccess: () => afterSave(['ingredients']),
  });
  const supMut = useMutation({
    mutationFn: () => {
      const body = {
        name: supForm.name.trim(),
        phone: supForm.phone || null,
        note: supForm.note || null,
      };
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
    setSupForm(
      s ? { id: s.id, name: s.name, phone: s.phone ?? '', note: s.note ?? '' } : blankSup(),
    );
    setModal({ type: 'supplier' });
  };

  const impIng = ingredients.find((i) => i.id === impForm.ingredientId);
  const impTotal = (Number(impForm.quantity) || 0) * (Number(impForm.unitCost) || 0);

  const goBack = () => navigate('/m');

  return (
    <div className="mwh">
      <header className="mwh-top">
        <div className="mwh-toprow">
          <button type="button" className="mwh-back" onClick={goBack} aria-label="Quay lại">
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <div>
            <div className="mwh-title">Kho nguyên liệu</div>
            <div className="mwh-sub">
              {kpi.total} nguyên liệu · {kpi.low} sắp hết
            </div>
          </div>
        </div>

        <div className="mwh-tabs">
          {tabs.map(([k, label]) => (
            <button
              key={k}
              className={`mwh-tab${tab === k ? ' active' : ''}`}
              onClick={() => setTab(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="mwh-scroll">
        {/* TAB: TỒN KHO */}
        {tab === 'stock' && (
          <>
            <div className="mwh-kpis">
              <div className="mwh-kpi">
                <div className="mwh-kpi-label">Tổng nguyên liệu</div>
                <div className="mwh-kpi-value">{kpi.total}</div>
              </div>
              <div className="mwh-kpi warn">
                <div className="mwh-kpi-label">Sắp hết hàng</div>
                <div className="mwh-kpi-value">{kpi.low}</div>
              </div>
              {isAdmin && (
                <div className="mwh-kpi">
                  <div className="mwh-kpi-label">Giá trị tồn</div>
                  <div className="mwh-kpi-value">{(kpi.value / 1e6).toFixed(1)}tr</div>
                </div>
              )}
            </div>

            <div className="mwh-search">
              <Search size={16} strokeWidth={2} />
              <input
                placeholder="Tìm nguyên liệu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="mwh-chips">
              <button
                className={`mwh-chip${fCat === '' ? ' active' : ''}`}
                onClick={() => setFCat('')}
              >
                Tất cả
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={`mwh-chip${fCat === c.id ? ' active' : ''}`}
                  onClick={() => setFCat(c.id)}
                >
                  {catLabel(c.name)}
                </button>
              ))}
            </div>

            {isAdmin && (
              <button className="mwh-addrow" onClick={() => openIngredient(null)}>
                <Plus size={15} strokeWidth={2} />
                Thêm nguyên liệu
              </button>
            )}

            {ingredientsQuery.isLoading && <div className="mwh-empty">Đang tải…</div>}
            {!ingredientsQuery.isLoading && groups.length === 0 && (
              <div className="mwh-empty">Không có nguyên liệu nào khớp.</div>
            )}
            {groups.map((g) => (
              <div key={g.name} className="mwh-group">
                <div className="mwh-group-head">
                  <span className="mwh-group-name">{g.name}</span>
                  <span className="mwh-group-count">{g.items.length} mục</span>
                </div>
                {g.items.map((it) => {
                  const low = Number(it.stockQty) < Number(it.lowStockThreshold);
                  return (
                    <div key={it.id} className="mwh-card">
                      <div className="mwh-card-main">
                        <div className="mwh-card-name">{it.name}</div>
                        <div className="mwh-card-meta">
                          Ngưỡng: {formatQty(it.lowStockThreshold)} {it.unitCode}
                          {isAdmin && it.costPrice != null && ` · Vốn ${formatVnd(it.costPrice)}`}
                          {it.yieldQuantity != null &&
                            ` · Yield ${formatQty(it.yieldQuantity)} ${it.yieldUnitCode}`}
                        </div>
                      </div>
                      <div className="mwh-card-right">
                        <div>
                          <span className="mwh-card-qty">{formatQty(it.stockQty)}</span>{' '}
                          <span className="mwh-card-unit">{it.unitCode}</span>
                        </div>
                        <span className={`mwh-badge ${low ? 'low' : 'ok'}`}>
                          {low ? 'Sắp hết' : 'Đủ hàng'}
                        </span>
                      </div>
                      {isAdmin && (
                        <div className="mwh-card-actions">
                          <button
                            className="mwh-iconbtn"
                            title="Sửa"
                            onClick={() => openIngredient(it)}
                          >
                            <Pencil size={15} strokeWidth={1.8} />
                          </button>
                          <button
                            className="mwh-iconbtn"
                            title="Ngừng dùng"
                            onClick={() => {
                              statusMut.reset();
                              setModal({ type: 'status', target: it });
                            }}
                          >
                            <Power size={15} strokeWidth={1.8} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}

        {/* TAB: NHẬP KHO */}
        {tab === 'import' && isAdmin && (
          <>
            <div className="mwh-form-box">
              <div className="mwh-form-title">Lập phiếu nhập kho</div>
              <div className="mwh-form-hint">
                Số lượng sẽ được cộng thẳng vào tồn kho sau khi lưu
              </div>
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
              <div className="form-field mwh-mt">
                <label className="form-label">Nhà cung cấp</label>
                <select
                  className="form-select"
                  value={impForm.supplierId}
                  onChange={(e) => setImpForm((f) => ({ ...f, supplierId: e.target.value }))}
                >
                  <option value="">— Không chọn —</option>
                  {suppliers
                    .filter((s) => s.active)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="mwh-form-two mwh-mt">
                <div className="form-field">
                  <label className="form-label">Số lượng {impIng ? `(${impIng.unitCode})` : ''}</label>
                  <input
                    className="form-input"
                    type="number"
                    inputMode="decimal"
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
                    inputMode="numeric"
                    placeholder="0"
                    value={impForm.unitCost}
                    onChange={(e) => setImpForm((f) => ({ ...f, unitCost: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mwh-form-two mwh-mt">
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
              </div>
              <div className="form-field mwh-mt">
                <label className="form-label">Ghi chú</label>
                <input
                  className="form-input"
                  placeholder="Không bắt buộc"
                  value={impForm.note}
                  onChange={(e) => setImpForm((f) => ({ ...f, note: e.target.value }))}
                />
              </div>
              <div className="mwh-imp-total">
                <span>Thành tiền</span>
                <span className="mwh-imp-total-val">{formatVnd(impTotal)}</span>
              </div>
              {importMut.isError && (
                <p className="mt-2 text-[12px] text-wine">{errorMessage(importMut.error)}</p>
              )}
              <button
                className="mwh-save"
                disabled={!impForm.ingredientId || !impForm.quantity || importMut.isPending}
                onClick={() => importMut.mutate()}
              >
                {importMut.isPending ? 'Đang lưu…' : 'Lưu phiếu nhập'}
              </button>
            </div>

            <div className="mwh-form-title mwh-mt">Lịch sử nhập kho</div>
            <select
              className="nv-select mwh-mt"
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
            {!importsQuery.isLoading && imports.length === 0 && (
              <div className="mwh-empty">Chưa có phiếu nhập nào.</div>
            )}
            {imports.map((r) => (
              <div key={r.id} className="mwh-imp-card">
                <div className="mwh-imp-row1">
                  <span className="mwh-imp-ing">{r.ingredientName}</span>
                  <span className="mwh-imp-qty">
                    {formatQty(r.quantity)} {r.unitCode}
                  </span>
                </div>
                <div className="mwh-imp-row2">
                  {formatDate(r.importedAt)} · {r.batchCode || 'không lô'} ·{' '}
                  {formatVnd(r.unitCost)} · {r.supplierName || 'không NCC'} · {r.importedByName}
                </div>
              </div>
            ))}
          </>
        )}

        {/* TAB: NHÀ CUNG CẤP */}
        {tab === 'supplier' && isAdmin && (
          <>
            <button className="mwh-addrow" onClick={() => openSupplier(null)}>
              <Plus size={15} strokeWidth={2} />
              Thêm nhà cung cấp
            </button>
            {suppliers.length === 0 && <div className="mwh-empty">Chưa có nhà cung cấp nào.</div>}
            {suppliers.map((s) => (
              <div key={s.id} className="mwh-sup-card">
                <div className="mwh-sup-avatar">{s.name.slice(0, 2).toUpperCase()}</div>
                <div className="mwh-sup-info">
                  <div className="mwh-sup-name">
                    {s.name}
                    {!s.active && <span className="mwh-badge inactive">Ngừng dùng</span>}
                  </div>
                  <div className="mwh-sup-meta">
                    {s.phone || 'chưa có SĐT'}
                    {s.note ? ` · ${s.note}` : ''}
                  </div>
                </div>
                <div className="mwh-card-actions">
                  <button className="mwh-iconbtn" title="Sửa" onClick={() => openSupplier(s)}>
                    <Pencil size={15} strokeWidth={1.8} />
                  </button>
                  <button
                    className="mwh-iconbtn"
                    title={s.active ? 'Ngừng dùng' : 'Dùng lại'}
                    onClick={() => supStatusMut.mutate(s)}
                  >
                    {s.active ? <Power size={15} strokeWidth={1.8} /> : <RotateCcw size={15} strokeWidth={1.8} />}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* MODAL: Thêm/Sửa nguyên liệu */}
      {modal?.type === 'ingredient' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div
            className="modal-box modal-lg"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '88vh', overflowY: 'auto' }}
          >
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
            <div className="mwh-form-two" style={{ marginTop: 10 }}>
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
                  inputMode="decimal"
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
                inputMode="numeric"
                placeholder="Chỉ Admin thấy mục này"
                value={ingForm.costPrice}
                onChange={(e) => setIngForm((f) => ({ ...f, costPrice: e.target.value }))}
              />
            </div>
            <div className="checkbox-row">
              <input
                type="checkbox"
                id="mwhHasYield"
                checked={ingForm.hasYield}
                onChange={(e) => setIngForm((f) => ({ ...f, hasYield: e.target.checked }))}
              />
              <label htmlFor="mwhHasYield">Có thành phẩm pha chế (vd: trà ủ, cold brew, siro)</label>
            </div>
            {ingForm.hasYield && (
              <div className="yield-box">
                <div className="modal-hint" style={{ marginBottom: 8 }}>
                  1 đơn vị lưu kho pha ra bao nhiêu đơn vị thành phẩm — đơn vị thành phẩm phải khác
                  hệ đo với đơn vị lưu kho.
                </div>
                <div className="mwh-form-two">
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
                    <label className="form-label">SL thành phẩm / 1 đơn vị kho</label>
                    <input
                      className="form-input"
                      type="number"
                      inputMode="decimal"
                      placeholder="vd: 4"
                      value={ingForm.yieldQuantity}
                      onChange={(e) => setIngForm((f) => ({ ...f, yieldQuantity: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}
            {ingMut.isError && <p className="text-[12px] text-wine">{errorMessage(ingMut.error)}</p>}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal}>
                Huỷ
              </button>
              <button
                className="btn-confirm"
                disabled={
                  !ingForm.name.trim() || !ingForm.categoryId || !ingForm.unitId || ingMut.isPending
                }
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
            {supMut.isError && <p className="text-[12px] text-wine">{errorMessage(supMut.error)}</p>}
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

      <MobileTabBar active="kho" />
    </div>
  );
}
