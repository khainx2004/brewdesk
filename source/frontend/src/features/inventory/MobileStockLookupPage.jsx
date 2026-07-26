import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Beaker,
  Candy,
  ChefHat,
  ChevronLeft,
  Cherry,
  Coffee,
  Croissant,
  CupSoda,
  Milk,
  Package,
  Search,
  Soup,
  SprayCan,
  Wine,
} from 'lucide-react';
import MobileTabBar from '../../components/layout/MobileTabBar';
import { ingredientApi } from '../../services/inventoryApi';
import { useShift } from '../../hooks/useShift';
import { formatQty } from '../../utils/fmt';

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

// Icon Lucide cho từng nhóm (mockup vẽ SVG riêng; app chỉ dùng Lucide).
const CATEGORY_ICON = {
  'Cà phê': Coffee,
  Bột: Soup,
  Trà: CupSoda,
  'Chất tạo ngọt': Candy,
  Sữa: Milk,
  Siro: Wine,
  'Tự làm tại quán': ChefHat,
  Topping: Cherry,
  'Vệ sinh': SprayCan,
  'Đồ rót / pha chế': Beaker,
  Bánh: Croissant,
};
const catIcon = (name) => CATEGORY_ICON[name] || Package;

/**
 * Màn mobile "Tra cứu tồn kho nhanh" — chỉ xem, cho nhân viên đứng ở kho tra
 * nhanh còn bao nhiêu. Bám `design/kho_tra_cuu_mobile_mockup`.
 *
 * <p>Không nằm trong AppShell: đây là màn mobile riêng, có thanh nav dưới cùng
 * thay cho topbar/sidebar desktop. Chỉ đọc — không có thao tác sửa tồn.
 */
export default function MobileStockLookupPage() {
  const navigate = useNavigate();
  const { clock } = useShift();
  const [search, setSearch] = useState('');
  const [curCat, setCurCat] = useState(''); // '' = Tất cả; nếu khác là tên nhóm DB

  const query = useQuery({
    queryKey: ['ingredients', 'mobile-lookup'],
    queryFn: () => ingredientApi.list({ size: 500 }),
  });
  const ingredients = useMemo(() => query.data?.items ?? [], [query.data]);

  // Các nhóm thực có, xếp theo thứ tự mockup.
  const cats = useMemo(() => {
    const set = new Set(ingredients.map((i) => i.categoryName));
    return [...set].sort((a, b) => catRank(a) - catRank(b));
  }, [ingredients]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map();
    for (const it of ingredients) {
      if (curCat && it.categoryName !== curCat) continue;
      if (q && !it.name.toLowerCase().includes(q)) continue;
      if (!map.has(it.categoryName)) map.set(it.categoryName, []);
      map.get(it.categoryName).push(it);
    }
    return [...map.entries()]
      .sort((a, b) => catRank(a[0]) - catRank(b[0]))
      .map(([name, items]) => ({ name, label: catLabel(name), Icon: catIcon(name), items }));
  }, [ingredients, curCat, search]);

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  return (
    <div className="mstock">
      <header className="mstock-top">
        <div className="mstock-toprow">
          <button type="button" className="mstock-back" onClick={goBack} aria-label="Quay lại">
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <div>
            <div className="mstock-title">Tra cứu tồn kho</div>
            <div className="mstock-sub">Cập nhật lúc {clock} · chỉ xem</div>
          </div>
        </div>
        <div className="mstock-search">
          <Search size={16} strokeWidth={2} />
          <input
            placeholder="Tìm nguyên liệu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="mstock-chips">
        <button
          className={`mstock-chip${curCat === '' ? ' active' : ''}`}
          onClick={() => setCurCat('')}
        >
          Tất cả
        </button>
        {cats.map((c) => (
          <button
            key={c}
            className={`mstock-chip${curCat === c ? ' active' : ''}`}
            onClick={() => setCurCat(c)}
          >
            {catLabel(c)}
          </button>
        ))}
      </div>

      <div className="mstock-list">
        {query.isLoading && <div className="mstock-empty">Đang tải…</div>}
        {!query.isLoading && groups.length === 0 && (
          <div className="mstock-empty">Không tìm thấy nguyên liệu phù hợp</div>
        )}
        {groups.map((g) => {
          const Icon = g.Icon;
          return (
            <div key={g.name}>
              <div className="mstock-sec">{g.label}</div>
              {g.items.map((it) => {
                const low = Number(it.stockQty) < Number(it.lowStockThreshold);
                return (
                  <div key={it.id} className="mstock-card">
                    <div className="mstock-ic">
                      <Icon size={19} strokeWidth={1.8} />
                    </div>
                    <div className="mstock-info">
                      <div className="mstock-name">{it.name}</div>
                      <div className="mstock-thr">
                        Ngưỡng cảnh báo: {formatQty(it.lowStockThreshold)} {it.unitCode}
                      </div>
                    </div>
                    <div className="mstock-right">
                      <span className="mstock-num">{formatQty(it.stockQty)}</span>{' '}
                      <span className="mstock-unit">{it.unitCode}</span>
                      <span className={`mstock-badge${low ? ' low' : ' ok'}`}>
                        {low ? 'Sắp hết' : 'Đủ hàng'}
                        <span className={`mstock-dot${low ? ' low' : ' ok'}`} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <MobileTabBar active="kho" />
    </div>
  );
}
