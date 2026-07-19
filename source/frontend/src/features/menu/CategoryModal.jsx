import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Power, PowerOff } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { categoryApi } from '../../services/menuApi';
import { errorMessage } from '../../services/api';

export default function CategoryModal({ open, onClose, categories }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [error, setError] = useState(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['menu-items'] });
  };

  const createMutation = useMutation({
    mutationFn: (body) => categoryApi.create(body),
    onSuccess: () => {
      setName('');
      setError(null);
      refresh();
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) =>
      active ? categoryApi.deactivate(id) : categoryApi.activate(id),
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const add = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), displayOrder: categories.length + 1 });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Danh mục món"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-wine/30 bg-wine/8 px-4 py-3 text-sm text-wine">
          {error}
        </div>
      )}

      <form onSubmit={add} className="mb-5 flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Thêm danh mục"
            placeholder="vd: Cà phê"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={createMutation.isPending}
          />
        </div>
        <Button type="submit" loading={createMutation.isPending} disabled={!name.trim()}>
          <Plus size={15} strokeWidth={2} />
          Thêm
        </Button>
      </form>

      <div className="divide-y divide-olive-mute border-t border-olive-mute">
        {categories.length === 0 && (
          <p className="py-6 text-center text-sm text-olive">Chưa có danh mục nào.</p>
        )}
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2.5">
              <span className={c.active ? 'text-sm' : 'text-sm text-olive line-through'}>
                {c.name}
              </span>
              {!c.active && <Badge tone="muted">Ngừng</Badge>}
            </div>
            <Button
              size="sm"
              variant={c.active ? 'danger' : 'secondary'}
              loading={
                toggleMutation.isPending && toggleMutation.variables?.id === c.id
              }
              onClick={() => toggleMutation.mutate({ id: c.id, active: c.active })}
            >
              {c.active ? <PowerOff size={13} strokeWidth={1.8} /> : <Power size={13} strokeWidth={1.8} />}
              {c.active ? 'Ngừng' : 'Mở lại'}
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-olive">
        Không ngừng được danh mục còn món đang bán — cần ngừng bán các món trong đó
        trước.
      </p>
    </Modal>
  );
}
