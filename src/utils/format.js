export const MANGA_STATUS = {
	COMPLETED: 'Hoàn thành',
	ONGOING: 'Còn tiếp',
	ONHOLD: 'Tạm dừng',
};

export const MANGA_STATUS_TONE = {
	COMPLETED: 'green',
	ONGOING: 'blue',
	ONHOLD: 'red',
};

export const TRANS_GROUP_STATUS = {
	APPROVED: 'Đang hoạt động',
	DELETED: 'Đã xoá',
};

export const JOIN_REQUEST_STATUS = {
	PENDING: 'Chờ duyệt',
	APPROVED: 'Đã duyệt',
	REJECTED: 'Từ chối',
};

export const JOIN_REQUEST_TONE = {
	PENDING: 'amber',
	APPROVED: 'green',
	REJECTED: 'red',
};

// Lưu ý: backend dùng literal sai chính tả "REJECTD".
export const CREATION_REQUEST_STATUS = {
	PENDING: 'Chờ duyệt',
	APPROVED: 'Đã duyệt',
	REJECTD: 'Từ chối',
};

export const CREATION_REQUEST_TONE = {
	PENDING: 'amber',
	APPROVED: 'green',
	REJECTD: 'red',
};

export const mangaStatusLabel = (status) => MANGA_STATUS[status] ?? status;
export const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '');
export const formatDateTime = (iso) => (iso ? new Date(iso).toLocaleString('vi-VN') : '');

/**
 * Định dạng khoảng thời gian từ thời điểm `iso` đến hiện tại theo yêu cầu:
 * - Dưới 1 phút: "vừa xong"
 * - Trên 1 phút: "x phút trước"
 * - Trên 1 giờ: "x giờ trước"
 * - Trên 1 ngày: "x ngày trước"
 * - Trên 1 tháng: "x tháng trước"
 * - Trên 1 năm: "x năm trước"
 */
export const formatRelativeTime = (iso) => {
	if (!iso) return '';
	const now = new Date();
	const date = new Date(iso);
	const diffMs = now.getTime() - date.getTime();
	if (diffMs <= 0) return 'vừa xong';

	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHour = Math.floor(diffMin / 60);
	const diffDay = Math.floor(diffHour / 24);
	const diffMonth = Math.floor(diffDay / 30);
	const diffYear = Math.floor(diffDay / 365);

	if (diffMin < 1) return 'vừa xong';
	if (diffMin < 60) return `${diffMin} phút trước`;
	if (diffHour < 24) return `${diffHour} giờ trước`;
	if (diffDay < 30) return `${diffDay} ngày trước`;
	if (diffMonth < 12) return `${diffMonth} tháng trước`;
	return `${diffYear} năm trước`;
};

/** Định dạng số lượt xem ngắn gọn hoặc có dấu phân cách */
export const formatViews = (views) => {
	if (views == null) return '0';
	const num = Number(views);
	if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
	if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
	return num.toLocaleString('vi-VN');
};
