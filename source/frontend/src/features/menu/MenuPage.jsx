import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderCog, Pencil, Plus, Power, PowerOff, Search } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { categoryApi, menuItemApi } from '../../services/menuApi';
import { errorMessage } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { formatVnd } from '../../utils/fmt';
import MenuItemFormModal from './MenuItemFormModal';
import CategoryModal from './CategoryModal';

const PAGE_SIZE = 20;

export default function MenuPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const queryClient = useQueryClient();

  const [categoryId, setCategoryId] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Chờ người dùng ngừng gõ rồi mới gọi API, tránh bắn request mỗi ký tự
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

  const activeCategories = (categoriesQuery.data?.items ?? []).filter((c) => c.active);
  const allCategories = categoriesQuery.data?.items ?? [];
  const items = itemsQuery.data?.items ?? [];

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

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setFormOpen(true);
  };

  const totalPages = itemsQuery.data?.totalPages ?? 0;

  return (
    <AppShell>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl italic">Menu</h1>
          <p className="mt-1 text-sm text-caramel">
            {itemsQuery.data ? `${itemsQuery.data.totalItems} món` : 'Đang tải...'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setCategoryOpen(true)}>
              <FolderCog size={15} strokeWidth={1.6} />
              Danh mục
            </Button>
            <Button onClick={openCreate} disabled={activeCategories.length === 0}>
              <Plus size={15} strokeWidth={2} />
              Thêm món
            </Button>
          </div>
        )}
      </div>

      {isAdmin && activeCategories.length === 0 && !categoriesQuery.isLoading && (
        <div className="mb-5 rounded-lg border border-caramel/30 bg-caramel/8 px-4 py-3 text-sm text-caramel">
          Chưa có danh mục nào đang hoạt động. Tạo danh mục trước rồi mới thêm món được.
        </div>
      )}

      {actionError && (
        <div className="mb-5 rounded-lg border border-wine/30 bg-wine/8 px-4 py-3 text-sm text-wine">
          {actionError}
        </div>
      )}

      {/* Bộ lọc */}
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => {
              setCategoryId('');
              setPage(0);
            }}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
              categoryId === ''
                ? 'border-rogue bg-rogue text-batter-lt shadow-cta'
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
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                categoryId === c.id
                  ? 'border-rogue bg-rogue text-batter-lt shadow-cta'
                  : 'border-olive-mute text-olive hover:border-rogue hover:text-rogue'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search
              size={15}
              strokeWidth={1.6}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-olive"
            />
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="Tìm theo tên món"
              className="h-10 w-full rounded-lg border border-olive-mute bg-cream pl-9 pr-3 text-sm outline-none transition placeholder:text-olive/70 focus:border-rogue focus:ring-[3px] focus:ring-rogue/15"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-rogue">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => {
                setIncludeInactive(e.target.checked);
                setPage(0);
              }}
              className="h-3.5 w-3.5 accent-rogue"
            />
            Hiện cả món ngừng bán
          </label>
        </div>
      </div>

      {/* Danh sách */}
      <div className="overflow-hidden rounded-xl border border-olive-mute bg-batter-lt shadow-card">
        {itemsQuery.isLoading ? (
          <p className="py-14 text-center text-sm text-olive">Đang tải danh sách món...</p>
        ) : itemsQuery.isError ? (
          <p className="py-14 text-center text-sm text-wine">
            {errorMessage(itemsQuery.error)}
          </p>
        ) : items.length === 0 ? (
          <p className="py-14 text-center text-sm text-olive">
            {keyword ? `Không tìm thấy món nào khớp "${keyword}".` : 'Chưa có món nào.'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-olive-mute bg-batter-warm/50 text-left text-xs text-olive">
                <th className="px-5 py-3 font-semibold">Tên món</th>
                <th className="px-5 py-3 font-semibold">Danh mục</th>
                <th className="px-5 py-3 text-right font-semibold">Giá</th>
                <th className="px-5 py-3 font-semibold">Trạng thái</th>
                {isAdmin && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-olive-mute/60">
              {items.map((item) => (
                <tr key={item.id} className="transition hover:bg-cream/60">
                  <td className="px-5 py-3">
                    <div className={item.active ? 'font-medium' : 'font-medium text-olive'}>
                      {item.name}
                    </div>
                    {item.description && (
                      <div className="mt-0.5 text-xs text-olive">{item.description}</div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-olive">{item.categoryName}</td>
                  <td className="px-5 py-3 text-right font-semibold text-caramel">
                    {formatVnd(item.price)}
                  </td>
                  <td className="px-5 py-3">
                    {item.active ? (
                      <Badge tone="active">Đang bán</Badge>
                    ) : (
                      <Badge tone="muted">Ngừng bán</Badge>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>
                          <Pencil size={13} strokeWidth={1.7} />
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant={item.active ? 'danger' : 'secondary'}
                          loading={
                            toggleMutation.isPending &&
                            toggleMutation.variables?.id === item.id
                          }
                          onClick={() =>
                            toggleMutation.mutate({ id: item.id, active: item.active })
                          }
                        >
                          {item.active ? (
                            <PowerOff size={13} strokeWidth={1.7} />
                          ) : (
                            <Power size={13} strokeWidth={1.7} />
                          )}
                          {item.active ? 'Ngừng bán' : 'Mở bán'}
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm">
          <span className="text-olive">
            Trang {page + 1} / {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      <MenuItemFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(body) => saveMutation.mutateAsync(body)}
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
