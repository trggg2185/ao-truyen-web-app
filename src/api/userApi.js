import axiosClient, { multipart } from './axiosClient';
import { ENDPOINTS } from './endpoints';
import { toFormData } from '../utils/formData';

export const userApi = {
	/* --- public profile --- */
	getProfile: (idOrUsername) => axiosClient.get(ENDPOINTS.users.profile(idOrUsername)),

	/* --- current user --- */
	getMe: () => axiosClient.get(ENDPOINTS.users.me),
	updateMe: ({ displayName, facebook, discord, bio, avatar }) =>
		axiosClient.patch(
			ENDPOINTS.users.me,
			toFormData({ displayName, facebook, discord, bio, avatar }),
			multipart(),
		),
	deleteMe: () => axiosClient.delete(ENDPOINTS.users.me),
	getMyJoinRequests: (params) => axiosClient.get(ENDPOINTS.users.meJoinRequests, { params }),
	getMyCreationRequests: (params) =>
		axiosClient.get(ENDPOINTS.users.meCreationRequests, { params }),

	/* --- admin --- */
	list: (params) => axiosClient.get(ENDPOINTS.admin.users, { params }),
	get: (id) => axiosClient.get(ENDPOINTS.admin.user(id)),
	update: (id, fields) =>
		axiosClient.patch(ENDPOINTS.admin.user(id), toFormData(fields), multipart()),
	ban: (id) => axiosClient.patch(ENDPOINTS.admin.ban(id)),
	unban: (id) => axiosClient.patch(ENDPOINTS.admin.unban(id)),
};
