'use client';
import { useMemo } from 'react';
import { useTable } from '@/hooks/use-table';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { deleteUser } from '@/lib/actions/admin.actions';
import { useSWRConfig } from 'swr';
import { users } from '@/db/schema';
import { type InferSelectModel } from 'drizzle-orm';
import { UserAvatar } from '@/components/user-avatar';

type User = InferSelectModel<typeof users>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function UserManagementTable({ users }: { users: User[] }) {
  const { mutate } = useSWRConfig();
  const columns = useMemo<ColumnDef<User>[]>(() => [
    {
      accessorKey: 'image',
      header: 'User',
      cell: ({ row }) => (
        <UserAvatar user={row.original} className="h-8 w-8" />
      )
    },
    {
      accessorKey: 'name',
      header: 'Name'
    },
    {
      accessorKey: 'email',
      header: 'Email'
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }: { row: { original: User } }) => (
        <Badge variant={row.original.role === 'admin' ? 'default' : 'secondary'}>
          {row.original.role}
        </Badge>
      )
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button
          variant="destructive"
          size="sm"
          onClick={async () => {
            await deleteUser(row.original.id! );
            mutate('/api/admin/users');
          }}
        >
          Delete
        </Button>
      )
    }
  ], [mutate]);

  const { Table } = useTable({
    columns,
    endpoint: '/api/admin/users',
    keyField: 'id'
  });

  return <Table />;
} 