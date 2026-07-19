import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { errorMessage } from '../../services/api';

const EMPTY = { categoryId: '', name: '', description: '', price: '', displayOrder: 0 };

export default function MenuItemFormModal({ open, onClose, onSubmit, item, categories }) {
  const editing = Boolean(item);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
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
      });
      onClose();
    } catch (error) {
      // Lỗi nghiệp vụ như trùng tên phải hiện ngay trong form, không đóng modal
      setServerError(errorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Sửa món' : 'Thêm món mới'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            {editing ? 'Lưu thay đổi' : 'Thêm món'}
          </Button>
        </>
      }
    >
      {serverError && (
        <div className="mb-4 rounded-lg border border-wine/30 bg-wine/8 px-4 py-3 text-sm text-wine">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-rogue">Danh mục</span>
          <select
            className={`h-10 w-full rounded-lg border bg-batter-lt px-3 text-sm text-ink-deep outline-none transition focus:border-rogue focus:bg-cream focus:ring-[3px] focus:ring-rogue/15 ${
              errors.categoryId ? 'border-wine' : 'border-olive-mute'
            }`}
            disabled={isSubmitting}
            {...register('categoryId', { required: 'Chưa chọn danh mục' })}
          >
            {categories.length === 0 && <option value="">Chưa có danh mục nào</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <span className="mt-1.5 block text-xs text-wine">{errors.categoryId.message}</span>
          )}
        </label>

        <Input
          label="Tên món"
          placeholder="vd: Đen đá"
          disabled={isSubmitting}
          error={errors.name?.message}
          {...register('name', {
            required: 'Chưa nhập tên món',
            maxLength: { value: 150, message: 'Tên món tối đa 150 ký tự' },
          })}
        />

        <Input
          label="Giá (VNĐ)"
          type="number"
          step="1"
          min="0"
          placeholder="25000"
          disabled={isSubmitting}
          hint="Số nguyên, không có phần thập phân. Món tặng kèm để 0."
          error={errors.price?.message}
          {...register('price', {
            required: 'Chưa nhập giá',
            min: { value: 0, message: 'Giá không được âm' },
            validate: (v) =>
              Number.isInteger(Number(v)) || 'Giá phải là số nguyên, không có phần lẻ',
          })}
        />

        <Input
          label="Thứ tự hiển thị"
          type="number"
          min="0"
          disabled={isSubmitting}
          hint="Số nhỏ hiện trước."
          error={errors.displayOrder?.message}
          {...register('displayOrder', {
            min: { value: 0, message: 'Thứ tự không được âm' },
          })}
        />

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-rogue">
            Mô tả <span className="font-normal text-olive">(không bắt buộc)</span>
          </span>
          <textarea
            rows={2}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-olive-mute bg-batter-lt px-3 py-2 text-sm text-ink-deep outline-none transition placeholder:text-olive/70 focus:border-rogue focus:bg-cream focus:ring-[3px] focus:ring-rogue/15"
            placeholder="Ghi chú thêm về món"
            {...register('description')}
          />
        </label>
      </form>
    </Modal>
  );
}
