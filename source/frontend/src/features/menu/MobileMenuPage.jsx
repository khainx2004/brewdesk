import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FolderCog, Funnel, Plus, Search } from 'lucide-react';
import MobileTabBar from '../../components/layout/MobileTabBar';
import { categoryApi, menuItemApi } from '../../services/menuApi';
import { errorMessage } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import MenuCard from './MenuCard';
import MenuItemFormModal from './MenuItemFormModal';
import CategoryModal from './CategoryModal';
import RecipeModal from './RecipeModal';

const PAGE_SIZE = 60;

// Nút lọc bấm xoay vòng 3 trạng thái, y hệt bản desktop.
const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang bán' },
  { key: 'inactive', label: 'Tạm ẩn' },
];

/**
 * Màn mobile "Menu" — suy ra từ `MenuPage` desktop: giữ nguyên dữ liệu, bộ lọc
 * và các modal (thêm/sửa món, danh mục, công thức), chỉ đổi bố cục sang một cột +
 * topbar/tab bar mobile. ADMIN sửa được; STAFF chỉ xem + tra công thức.
 */
export default function MobileMenuPage() {
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const queryClient = useQueryClient();

  const [categoryId, setCategoryId] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [filterIdx, setFilterIdx] = useState(0);
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [recipeItem, setRecipeItem] = useState(null);
  const [actionError, setActionError] = useState(null);

  const filter = FILTERS[filterIdx];

  // Chờ ngừng gõ rồi mới gọi API, tránh bắn request mỗi ký tự.
  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(keywordInput);
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list({ size: 100, includeInactive: true }),
  });

  const includeInactive = filter.key !== 'active';

  const itemsQuery = useQuery({
    queryKey: ['menu-items', { categoryId, keyword, includeInactive, page }],
    queryFn: () =>
      menuItemApi.list({
        categoryId: categoryId || undefined,
        keyword: keyword || undefined,
        includeInactive,
        page,
        size: PAGE_SIZE,
      }),
  });

  const allCategories = categoriesQuery.data?.items ?? [];
  const activeCategories = allCategories.filter((c) => c.active);

  const rawItems = itemsQuery.data?.items ?? [];
  const items = filter.key === 'inactive' ? rawItems.filter((i) => !i.active) : rawItems;
  const totalPages = itemsQuery.data?.totalPages ?? 0;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const saveMutation = useMutation({
    mutationFn: (body) =>
      editing ? menuItemApi.update(editing.id, body) : menuItemApi.create(body),
    onSuccess: refresh,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) =>
      active ? menuItemApi.deactivate(id) : menuItemApi.activate(id),
    onSuccess: () => {
      setActionError(null);
      refresh();
    },
    onError: (err) => setActionError(errorMessage(err)),
  });

  const goBack = () => navigate('/m');
  const subtitle = itemsQuery.data
    ? `${itemsQuery.data.totalItems} món · ${activeCategories.length} danh mục`
    : 'Đang tải…';

  return (
    <div className="mmenu">
      <header className="mmenu-top">
        <div className="mmenu-toprow">
          <button type="button" className="mmenu-back" onClick={goBack} aria-label="Quay lại">
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <div>
            <div className="mmenu-title">Menu</div>
            <div className="mmenu-sub">{subtitle}</div>
          </div>
        </div>

        <div className="mmenu-search">
          <Search size={16} strokeWidth={2} />
          <input
            placeholder="Tìm tên món..."
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
          />
        </div>

        <div className="mmenu-chips">
          <button
            className={`mmenu-chip${categoryId === '' ? ' active' : ''}`}
            onClick={() => {
              setCategoryId('');
              setPage(0);
            }}
          >
            Tất cả
          </button>
          {activeCategories.map((c) => (
            <button
              key={c.id}
              className={`mmenu-chip${categoryId === c.id ? ' active' : ''}`}
              onClick={() => {
                setCategoryId(c.id);
                setPage(0);
              }}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="mmenu-actions">
          <button
            className="mmenu-filter"
            onClick={() => {
              setFilterIdx((i) => (i + 1) % FILTERS.length);
              setPage(0);
            }}
          >
            <Funnel size={13} strokeWidth={2} />
            {filter.label}
          </button>
          {isAdmin && (
            <>
              <button className="mmenu-filter" onClick={() => setCategoryOpen(true)}>
                <FolderCog size={13} strokeWidth={1.8} />
                Danh mục
              </button>
              <button
                className="mmenu-add"
                disabled={activeCategories.length === 0}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus size={14} strokeWidth={2} />
                Thêm món
              </button>
            </>
          )}
        </div>
      </header>

      {actionError && <div className="mmenu-err">{actionError}</div>}

      <div className="mmenu-list">
        {isAdmin && activeCategories.length === 0 && !categoriesQuery.isLoading && (
          <div className="mmenu-hint">
            Chưa có danh mục nào đang hoạt động. Tạo danh mục trước rồi mới thêm món được.
          </div>
        )}

        {itemsQuery.isLoading ? (
          <div className="mmenu-empty">Đang tải…</div>
        ) : itemsQuery.isError ? (
          <div className="mmenu-empty">{errorMessage(itemsQuery.error)}</div>
        ) : items.length === 0 ? (
          <div className="mmenu-empty">
            {keyword ? `Không tìm thấy món nào khớp "${keyword}".` : 'Chưa có món nào.'}
          </div>
        ) : (
          <div className="mmenu-grid">
            {items.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                canEdit={isAdmin}
                onEdit={(it) => {
                  setEditing(it);
                  setFormOpen(true);
                }}
                onToggle={(it) => toggleMutation.mutate({ id: it.id, active: it.active })}
                onRecipe={(it) => setRecipeItem(it)}
                toggling={toggleMutation.isPending && toggleMutation.variables?.id === item.id}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mmenu-pager">
            <span>
              Trang {page + 1} / {totalPages}
            </span>
            <div className="mmenu-pager-btns">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Trước
              </button>
              <button disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      <MenuItemFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(body) => saveMutation.mutateAsync(body)}
        onToggleActive={(payload) => toggleMutation.mutateAsync(payload)}
        item={editing}
        categories={activeCategories}
      />
      <CategoryModal
        open={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        categories={allCategories}
      />
      <RecipeModal
        open={Boolean(recipeItem)}
        onClose={() => setRecipeItem(null)}
        item={recipeItem}
        canEdit={isAdmin}
      />

      <MobileTabBar />
    </div>
  );
}
