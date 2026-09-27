import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMe } from '../features/auth/hooks';
import { useAdminUsers, useUpdateUserRoles } from '../features/admin/hooks';
import type { Role } from '../features/auth/types';

const ALL_ROLES: Role[] = ['STUDENT', 'INSTRUCTOR', 'MENTOR', 'ADMIN'];
const LIMIT = 20;

export function AdminUsersPage() {
  const { t } = useTranslation();
  const { data: me } = useMe();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminUsers({ search: search || undefined, role: role || undefined, page, limit: LIMIT });
  const updateRoles = useUpdateUserRoles();

  function toggleRole(userId: string, currentRoles: Role[], targetRole: Role, checked: boolean) {
    const nextRoles = checked ? [...currentRoles, targetRole] : currentRoles.filter((r) => r !== targetRole);
    if (nextRoles.length === 0) {
      return;
    }
    updateRoles.mutate({ userId, roles: nextRoles });
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{t('admin.users.title')}</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t('admin.users.searchPlaceholder') ?? ''}
          className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role | '');
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">{t('admin.users.allRoles')}</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="mt-6 text-gray-500">…</p>}
      {data && data.items.length === 0 && <p className="mt-6 text-gray-500">{t('admin.users.empty')}</p>}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2 pe-4">{t('admin.users.columns.name')}</th>
              <th className="py-2 pe-4">{t('admin.users.columns.email')}</th>
              <th className="py-2 pe-4">{t('admin.users.columns.roles')}</th>
              <th className="py-2 pe-4">{t('admin.users.columns.courses')}</th>
              <th className="py-2 pe-4">{t('admin.users.columns.enrollments')}</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((user) => {
              const isSelf = user.id === me?.id;
              return (
                <tr key={user.id} className="border-b border-gray-100">
                  <td className="py-2 pe-4">{user.displayName}</td>
                  <td className="py-2 pe-4 text-gray-600">{user.email}</td>
                  <td className="py-2 pe-4">
                    <div className="flex flex-wrap gap-2">
                      {ALL_ROLES.map((r) => {
                        const checked = user.roles.includes(r);
                        const disabled = isSelf || (checked && user.roles.length === 1);
                        return (
                          <label key={r} className="flex items-center gap-1 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={(e) => toggleRole(user.id, user.roles, r, e.target.checked)}
                            />
                            {r}
                          </label>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-2 pe-4 text-gray-600">{user._count.coursesOwned}</td>
                  <td className="py-2 pe-4 text-gray-600">{user._count.enrollments}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data && data.total > LIMIT && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-50"
          >
            {t('admin.users.prev')}
          </button>
          <span className="text-gray-500">{t('admin.users.pageOf', { page, totalPages })}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-50"
          >
            {t('admin.users.next')}
          </button>
        </div>
      )}
    </div>
  );
}
