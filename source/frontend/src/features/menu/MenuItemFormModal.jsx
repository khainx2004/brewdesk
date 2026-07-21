import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Sparkles } from 'lucide-react';
import Modal, { FieldLabel, Toggle } from '../../components/ui/Modal';
import { errorMessage } from '../../services/api';

const EMPTY = { categoryId: '', name: '', description: '', price: '', displayOrder: 0 };

// placeholder phải đặt màu rõ ràng, không thì Tailwind dùng xám lạnh mặc định
// (#9ca3af) — trái quy định "không dùng màu lạnh" ở CLAUDE.md mục 9.
const inputClass =
  'h-[38px] rounded-lg border bg-batter-lt px-3 text-[13.5px] text-ink-deep outline-none transition placeholder:text-olive/70 focus:border-rogue focus:ring-[3px] focus:ring-rogue/8 disabled:opacity-60';

export default function MenuItemFormModal({
  open,
  onClose,
  onSubmit,
  onToggleActive,
  item,
  categories,
}) {
  const editing = Boolean(item);
  const [serverError, setServerError] = useState(null);
  const [active, setActive] = useState(true);
  const [hasOptions, setHasOptions] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    setActive(item ? item.active : true);
    setHasOptions(item ? item.hasOptions : true);
    reset(
      item
        ? {
            categoryId: item.categoryId,
            name: item.name,
            description: item.description ?? '',
            price: String(item.price),
            displayOrder: item.displayOrder,
          }
        : { ...EMPTY, categoryId: categories[0]?.id ?? '' },
    );
  }, [open, item, categories, reset]);

  const submit = async (values) => {
    setServerError(null);
    try {
      await onSubmit({
        categoryId: values.categoryId,
        name: values.name.trim(),
        description: values.description?.trim() || null,
        price: Number(values.price),
        displayOrder: Number(values.displayOrder) || 0,
        hasOptions,
      });

      // Cờ hiển thị dùng endpoint riêng, chỉ gọi khi người dùng thực sự đổi
      if (editing && active !== item.active) {
        await onToggleActive({ id: item.id, active: item.active });
      }
      onClose();
    } catch (error) {
      // Lỗi nghiệp vụ như trùng tên phải hiện trong form, không đóng modal
      setServerError(errorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Sửa món — ${item.name}` : 'Thêm món mới'}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-lg border border-olive-mute bg-cream py-2.5 text-[13px] font-semibold text-olive transition hover:border-wine hover:text-wine disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSubmit(submit)}
            disabled={isSubmitting}
            className="flex flex-[2] items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-rogue to-rogue-dk py-2.5 text-[13px] font-bold text-batter-lt shadow-[0_3px_10px_rgba(58,61,46,0.25)] transition hover:-translate-y-px hover:shadow-[0_5px_16px_rgba(58,61,46,0.35)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isSubmitting && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {editing ? 'Lưu thay đổi' : 'Thêm món'}
          </button>
        </>
      }
    >
      {serverError && (
        <div className="rounded-lg border border-wine/30 bg-wine/8 px-4 py-3 text-[13px] text-wine">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-3.5" noValidate>
        <div className="flex gap-3.5">
          <div className="flex flex-[2] flex-col gap-1.5">
            <FieldLabel>Tên món</FieldLabel>
            <input
              className={`${inputClass} ${errors.name ? 'border-wine' : 'border-olive-mute'}`}
              placeholder="vd: Cà phê sữa đá"
              disabled={isSubmitting}
              {...register('name', {
                required: 'Chưa nhập tên món',
                maxLength: { value: 150, message: 'Tên món tối đa 150 ký tự' },
              })}
            />
            {errors.name && <span className="text-[11px] text-wine">{errors.name.message}</span>}
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <FieldLabel>Danh mục</FieldLabel>
            <select
              className={`${inputClass} cursor-pointer ${
                errors.categoryId ? 'border-wine' : 'border-olive-mute'
              }`}
              disabled={isSubmitting}
              {...register('categoryId', { required: 'Chưa chọn danh mục' })}
            >
              {categories.length === 0 && <option value="">Chưa có danh mục</option>}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3.5">
          <div className="flex max-w-[180px] flex-1 flex-col gap-1.5">
            <FieldLabel>Giá bán (VNĐ)</FieldLabel>
            <input
              type="number"
              step="1"
              min="0"
              className={`${inputClass} ${errors.price ? 'border-wine' : 'border-olive-mute'}`}
              placeholder="29000"
              disabled={isSubmitting}
              {...register('price', {
                required: 'Chưa nhập giá',
                min: { value: 0, message: 'Giá không được âm' },
                validate: (v) =>
                  Number.isInteger(Number(v)) || 'Giá phải là số nguyên, không có phần lẻ',
              })}
            />
            {errors.price && <span className="text-[11px] text-wine">{errors.price.message}</span>}
          </div>

          <div className="flex max-w-[180px] flex-1 flex-col gap-1.5">
            <FieldLabel>Thứ tự hiển thị</FieldLabel>
            <input
              type="number"
              min="0"
              className={`${inputClass} border-olive-mute`}
              disabled={isSubmitting}
              {...register('displayOrder', { min: 0 })}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel>Mô tả (tùy chọn)</FieldLabel>
          <textarea
            rows={3}
            className="resize-none rounded-lg border border-olive-mute bg-batter-lt px-3 py-2.5 text-[13.5px] outline-none transition placeholder:text-olive/70 focus:border-rogue focus:ring-[3px] focus:ring-rogue/8"
            placeholder="Mô tả ngắn về món..."
            disabled={isSubmitting}
            {...register('description')}
          />
        </div>

        {/* Bánh và đồ đóng chai không chọn mức ngọt / mức đá được. Cờ đặt ở
            từng món chứ không ở danh mục, vì ngoại lệ có thể nằm ngay trong
            nhóm đồ uống — cold brew đóng chai chẳng hạn. */}
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="flex items-center gap-1.5 text-[13.5px] font-medium">
              <Sparkles size={12} strokeWidth={2} className="text-rogue" />
              Cho chọn mức ngọt / mức đá
            </div>
            <div className="mt-px text-[11.5px] text-olive">
              {hasOptions
                ? 'Khi bán sẽ hỏi 3 mức 0% / 50% / 100% cho mỗi loại'
                : 'Tắt cho bánh và đồ đóng chai — khi bán chỉ hỏi số lượng'}
            </div>
          </div>
          <Toggle checked={hasOptions} onChange={setHasOptions} disabled={isSubmitting} />
        </div>

        {editing && (
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-[13.5px] font-medium">Hiển thị trên POS</div>
              <div className="mt-px text-[11.5px] text-olive">
                Tắt để tạm ẩn món khỏi màn hình bán hàng
              </div>
            </div>
            <Toggle checked={active} onChange={setActive} disabled={isSubmitting} />
          </div>
        )}
      </form>
    </Modal>
  );
}
