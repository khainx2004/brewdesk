import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { ingredientApi, recipeApi, unitApi } from '../../services/inventoryApi';
import { errorMessage } from '../../services/api';

const selectClass =
  'h-[30px] rounded-[7px] border border-olive-mute bg-cream px-2 text-[12.5px] text-ink-deep outline-none transition focus:border-rogue';

function newRow() {
  return { key: crypto.randomUUID(), ingredientId: '', quantity: '', unitId: '' };
}

export default function RecipeModal({ open, onClose, item }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState([]);
  const [serverError, setServerError] = useState(null);

  const ingredientsQuery = useQuery({
    queryKey: ['ingredients-all'],
    queryFn: () => ingredientApi.list({ size: 500, includeInactive: false }),
    enabled: open,
  });
  const unitsQuery = useQuery({
    queryKey: ['units'],
    queryFn: unitApi.list,
    enabled: open,
  });
  const recipeQuery = useQuery({
    queryKey: ['recipe', item?.id],
    queryFn: () => recipeApi.get(item.id),
    enabled: open && Boolean(item),
  });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
  }, [open]);

  useEffect(() => {
    if (!recipeQuery.data) return;
    setRows(
      recipeQuery.data.length > 0
        ? recipeQuery.data.map((line) => ({
            key: crypto.randomUUID(),
            ingredientId: line.ingredientId,
            quantity: String(line.quantity),
            unitId: line.unitId,
          }))
        : [newRow()],
    );
  }, [recipeQuery.data]);

  const ingredients = ingredientsQuery.data?.items ?? [];
  const units = unitsQuery.data ?? [];

  const saveMutation = useMutation({
    mutationFn: (lines) => recipeApi.replace(item.id, lines),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', item.id] });
      onClose();
    },
    onError: (err) => setServerError(errorMessage(err)),
  });

  const updateRow = (key, patch) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const removeRow = (key) => setRows((prev) => prev.filter((r) => r.key !== key));
  const addRow = () => setRows((prev) => [...prev, newRow()]);

  const save = () => {
    setServerError(null);
    const filled = rows.filter((r) => r.ingredientId && r.quantity && r.unitId);
    saveMutation.mutate(
      filled.map((r) => ({
        ingredientId: r.ingredientId,
        quantity: Number(r.quantity),
        unitId: r.unitId,
      })),
    );
  };

  const loading = ingredientsQuery.isLoading || unitsQuery.isLoading || recipeQuery.isLoading;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Công thức nguyên liệu — ${item?.name ?? ''}`}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saveMutation.isPending}
            className="flex-1 rounded-lg border border-olive-mute bg-cream py-2.5 text-[13px] font-semibold text-olive transition hover:border-wine hover:text-wine disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saveMutation.isPending || loading}
            className="flex flex-[2] items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-rogue to-rogue-dk py-2.5 text-[13px] font-bold text-batter-lt shadow-[0_3px_10px_rgba(58,61,46,0.25)] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {saveMutation.isPending && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            Lưu công thức
          </button>
        </>
      }
    >
      {serverError && (
        <div className="mb-3.5 rounded-lg border border-wine/30 bg-wine/8 px-4 py-3 text-[13px] text-wine">
          {serverError}
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-olive">Đang tải...</p>
      ) : (
        <div className="rounded-lg bg-batter p-3.5">
          <p className="mb-3 text-xs text-olive">
            Định nghĩa lượng nguyên liệu cần dùng cho <strong>1 phần</strong> của món này.
          </p>

          <div className="flex flex-col">
            {rows.map((row, i) => (
              <div
                key={row.key}
                className={`flex items-center gap-2 py-1.5 ${
                  i < rows.length - 1 ? 'border-b border-olive-mute/30' : ''
                }`}
              >
                <select
                  value={row.ingredientId}
                  onChange={(e) => updateRow(row.key, { ingredientId: e.target.value })}
                  className={`${selectClass} flex-1 cursor-pointer`}
                >
                  <option value="">Chọn nguyên liệu...</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0"
                  value={row.quantity}
                  onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                  className={`${selectClass} w-[68px] text-right`}
                />

                <select
                  value={row.unitId}
                  onChange={(e) => updateRow(row.key, { unitId: e.target.value })}
                  className={`${selectClass} w-[64px] cursor-pointer`}
                >
                  <option value="">Đvt</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.code}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => removeRow(row.key)}
                  aria-label="Xoá dòng"
                  className="p-0.5 text-olive-mute transition hover:text-wine"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addRow}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-olive-mute py-2 text-[12.5px] font-medium text-olive transition hover:border-rogue hover:text-rogue"
          >
            <Plus size={13} strokeWidth={2} />
            Thêm nguyên liệu
          </button>
        </div>
      )}
    </Modal>
  );
}
