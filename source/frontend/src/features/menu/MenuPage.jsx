import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderCog, Funnel, Plus, Search } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { categoryApi, menuItemApi } from '../../services/menuApi';
import { errorMessage } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import MenuCard from './MenuCard';
import MenuItemFormModal from './MenuItemFormModal';
import CategoryModal from './CategoryModal';

const PAGE_SIZE = 60;

// Nút lọc bấm xoay vòng qua 3 trạng thái, đúng như mockup
const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang bán' },
  { key: 'inactive', label: 'Tạm ẩn' },
];

export default function MenuPage() {
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
  const [actionError, setActionError] = useState(null);

  const filter = FILTERS[filterIdx];

  // Chờ ngừng gõ rồi mới gọi API, tránh bắn request mỗi ký tự
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

  // Lọc "Tạm ẩn" cần lấy cả món ngừng bán về rồi mới lọc phía client,
  // vì backend chỉ có cờ includeInactive chứ không có "chỉ lấy món ngừng bán".
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

  const totalPages = itemsQuery.data?.totalPages ?? 0;

  return (
    <AppShell>
      <div className="flex items-center justify-between px-7 pt-6">
        <div>
          <h1 className="font-display text-2xl italic">Quản lý Menu</h1>
          <p className="mt-0.5 text-[12.5px] text-olive">
            {itemsQuery.data
              ? `${itemsQuery.data.totalItems} món · ${activeCategories.length} danh mục`
              : 'Đang tải...'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setCategoryOpen(true)}
              className="flex h-[38px] items-center gap-1.5 rounded-lg border border-olive-mute bg-cream px-3.5 text-[12.5px] font-medium transition hover:border-rogue"
            >
              <FolderCog size={14} strokeWidth={1.6} />
              Danh mục
            </button>
            <button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              disabled={activeCategories.length === 0}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-rogue to-rogue-dk px-4 py-2.5 text-[13px] font-semibold text-batter-lt shadow-[0_3px_10px_rgba(58,61,46,0.3)] transition hover:-translate-y-px hover:shadow-[0_5px_16px_rgba(58,61,46,0.4)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Plus size={15} strokeWidth={2} />
              Thêm món mới
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 px-7 pt-4">
        <div className="relative max-w-[300px] flex-1">
          <Search
            size={15}
            strokeWidth={2}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-olive"
          />
          <input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder="Tìm tên món..."
            className="h-[38px] w-full rounded-lg border border-olive-mute bg-cream pl-9 pr-3 text-[13px] outline-none transition placeholder:text-olive/70 focus:border-rogue"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => {
              setCategoryId('');
              setPage(0);
            }}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              categoryId === ''
                ? 'border-rogue bg-rogue text-batter-lt'
                : 'border-olive-mute text-olive hover:border-rogue hover:text-rogue'
            }`}
          >
            Tất cả
          </button>
          {activeCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCategoryId(c.id);
                setPage(0);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                categoryId === c.id
                  ? 'border-rogue bg-rogue text-batter-lt'
                  : 'border-olive-mute text-olive hover:border-rogue hover:text-rogue'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setFilterIdx((i) => (i + 1) % FILTERS.length);
            setPage(0);
          }}
          className="flex h-[38px] items-center gap-1.5 rounded-lg border border-olive-mute bg-cream px-3.5 text-[12.5px] font-medium transition hover:border-rogue"
        >
          <Funnel size={14} strokeWidth={2} />
          {filter.label}
        </button>
      </div>

      <div className="flex-1 px-7 pb-7 pt-3.5">
        {isAdmin && activeCategories.length === 0 && !categoriesQuery.isLoading && (
          <div className="mb-3 rounded-lg border border-caramel/30 bg-caramel/8 px-4 py-3 text-sm text-caramel">
            Chưa có danh mục nào đang hoạt động. Tạo danh mục trước rồi mới thêm món được.
          </div>
        )}

        {actionError && (
          <div className="mb-3 rounded-lg border border-wine/30 bg-wine/8 px-4 py-3 text-sm text-wine">
            {actionError}
          </div>
        )}

        <div className="mb-3 text-xs text-olive">
          {itemsQuery.isLoading ? 'Đang tải...' : `${items.length} món`}
        </div>

        {itemsQuery.isError ? (
          <p className="py-16 text-center text-sm text-wine">{errorMessage(itemsQuery.error)}</p>
        ) : items.length === 0 && !itemsQuery.isLoading ? (
          <p className="py-16 text-center text-sm text-olive">
            {keyword ? `Không tìm thấy món nào khớp "${keyword}".` : 'Chưa có món nào.'}
          </p>
        ) : (
          <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
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
                toggling={
                  toggleMutation.isPending && toggleMutation.variables?.id === item.id
                }
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between text-sm">
            <span className="text-olive">
              Trang {page + 1} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-olive-mute bg-cream px-3 py-1.5 text-xs font-medium transition hover:border-rogue disabled:opacity-40"
              >
                Trước
              </button>
              <button
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-olive-mute bg-cream px-3 py-1.5 text-xs font-medium transition hover:border-rogue disabled:opacity-40"
              >
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
    </AppShell>
  );
}
