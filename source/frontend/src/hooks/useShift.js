import { useQuery } from '@tanstack/react-query';
import { shiftApi } from '../services/posApi';

/**
 * Ca làm việc và giờ hiển thị, cả hai đều lấy từ server.
 *
 * <p>Đồng hồ trên topbar cũng dùng giờ server chứ không dùng `new Date()`: hai
 * con số đứng cạnh nhau mà một cái theo máy, một cái theo server thì lúc lệch
 * giờ sẽ mâu thuẫn ngay trước mắt nhân viên. Đổi lại đồng hồ có thể trễ tối đa
 * bằng chu kỳ làm mới — chấp nhận được vì nó chỉ để tham khảo.
 */
export function useShift() {
  const query = useQuery({
    queryKey: ['shift-current'],
    queryFn: shiftApi.current,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const data = query.data;
  return {
    shift: data?.shift ?? null,
    label: data?.label ?? '',
    isOpen: Boolean(data?.shift),
    // "08:26:49.99" -> "08:26"
    clock: data?.serverTime ? data.serverTime.slice(0, 5) : '--:--',
    isLoading: query.isLoading,
  };
}
