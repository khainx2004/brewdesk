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

/**
 * Đơn vị gốc của một đơn vị: đơn vị quy đổi thì lấy baseUnitId, đơn vị gốc thì
 * là chính nó. Hai đơn vị cùng gốc mới quy đổi được cho nhau.
 * Khớp đúng logic UnitConverter ở backend.
 */
function baseIdOf(unit) {
  return unit?.baseUnitId ?? unit?.id;
}

/**
 * Công thức của một món.
 *
 * `canEdit = false` là chế độ chỉ xem, dành cho nhân viên: người pha chế cần tra
 * định lượng nhưng không được sửa. Chế độ này đọc thẳng tên nguyên liệu và đơn
 * vị có sẵn trong response công thức, nên **không** gọi tới danh sách nguyên
 * liệu và đơn vị — hai truy vấn đó chỉ phục vụ việc chọn khi soạn thảo.
 */
export default function RecipeModal({ open, onClose, item, canEdit = false }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState([]);
  const [serverError, setServerError] = useState(null);

  const ingredientsQuery = useQuery({
    queryKey: ['ingredients-all'],
    queryFn: () => ingredientApi.list({ size: 500, includeInactive: false }),
    enabled: open && canEdit,
  });
  const unitsQuery = useQuery({
    queryKey: ['units'],
    queryFn: unitApi.list,
    enabled: open && canEdit,
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

  /**
   * Đơn vị chọn được cho một nguyên liệu: cùng hệ đo với đơn vị lưu kho, cộng
   * thêm hệ đo của đơn vị thành phẩm nếu là bán thành phẩm.
   *
   * Ví dụ trà lưu kho bằng kg và khai 1kg ra 50 lít nước trà thì chọn được cả
   * kg, g (lá khô) lẫn l, ml (nước trà đã ủ).
   */
  const unitsFor = (ingredientId) => {
    const ingredient = ingredients.find((i) => i.id === ingredientId);
    if (!ingredient) return [];

    const bases = new Set();
    const stockUnit = units.find((u) => u.id === ingredient.unitId);
    if (stockUnit) bases.add(baseIdOf(stockUnit));

    if (ingredient.yieldUnitId) {
      const yieldUnit = units.find((u) => u.id === ingredient.yieldUnitId);
      if (yieldUnit) bases.add(baseIdOf(yieldUnit));
    }
    return units.filter((u) => bases.has(baseIdOf(u)));
  };

  const hintFor = (ingredientId) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    if (!ing) return 'Chọn nguyên liệu trước';
    if (ing.yieldUnitId) {
      return `Kho tính bằng ${ing.unitCode}; 1 ${ing.unitCode} ra ${ing.yieldQuantity} ${ing.yieldUnitCode} thành phẩm. Chọn được cả hai hệ.`;
    }
    return `Kho tính bằng ${ing.unitCode}, chỉ chọn được đơn vị cùng hệ đo`;
  };

  /**
   * Đổi nguyên liệu thì chọn sẵn luôn đơn vị lưu kho của nó. Nhờ vậy ô đơn vị
   * không bao giờ ở trạng thái lệch hệ đo — sai đơn vị thành chuyện không thể
   * xảy ra, thay vì để người dùng chọn bừa rồi báo lỗi lúc bấm Lưu.
   */
  const changeIngredient = (key, ingredientId) => {
    const ingredient = ingredients.find((i) => i.id === ingredientId);
    updateRow(key, { ingredientId, unitId: ingredient?.unitId ?? '' });
  };

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

  const loading = recipeQuery.isLoading || (canEdit && (ingredientsQuery.isLoading || unitsQuery.isLoading));
  const lines = recipeQuery.data ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Công thức nguyên liệu — ${item?.name ?? ''}`}
      footer={
        canEdit ? (
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
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-olive-mute bg-cream py-2.5 text-[13px] font-semibold text-olive transition hover:border-rogue hover:text-rogue"
          >
            Đóng
          </button>
        )
      }
    >
      {serverError && (
        <div className="mb-3.5 rounded-lg border border-wine/30 bg-wine/8 px-4 py-3 text-[13px] text-wine">
          {serverError}
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-olive">Đang tải...</p>
      ) : !canEdit ? (
        <div className="rounded-lg bg-batter p-3.5">
          <p className="mb-3 text-xs leading-relaxed text-olive">
            Lượng nguyên liệu cho <strong>1 phần</strong> của món này. Chỉ quản lý
            mới sửa được công thức.
          </p>

          {lines.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-wine">
              Món này chưa có công thức nên chưa bán được.
            </p>
          ) : (
            <div className="flex flex-col">
              {lines.map((line, i) => (
                <div
                  key={line.id}
                  className={`flex items-baseline justify-between gap-3 py-2 ${
                    i < lines.length - 1 ? 'border-b border-olive-mute/30' : ''
                  }`}
                >
                  <span className="text-[13px]">{line.ingredientName}</span>
                  <span className="shrink-0 text-[13px] font-semibold text-caramel">
                    {line.quantity} {line.unitCode}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-batter p-3.5">
          <p className="mb-3 text-xs leading-relaxed text-olive">
            Định nghĩa lượng nguyên liệu cần dùng cho <strong>1 phần</strong> của món này.
            Đơn vị trong ngoặc là đơn vị kho — ô đvt chỉ hiện những đơn vị quy đổi được
            sang nó.
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
                  onChange={(e) => changeIngredient(row.key, e.target.value)}
                  className={`${selectClass} flex-1 cursor-pointer`}
                >
                  <option value="">Chọn nguyên liệu...</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unitCode})
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
                  disabled={!row.ingredientId}
                  title={hintFor(row.ingredientId)}
                  className={`${selectClass} w-[64px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <option value="">Đvt</option>
                  {unitsFor(row.ingredientId).map((u) => (
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
