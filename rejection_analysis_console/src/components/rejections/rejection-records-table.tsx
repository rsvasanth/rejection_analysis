import { RejectionRecord } from '@/lib/types'
import { DataTable } from '@/components/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'

const columns: ColumnDef<RejectionRecord>[] = [
  {
    accessorKey: 'name',
    header: 'ID',
  },
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    accessorKey: 'item',
    header: 'Item',
  },
  {
    accessorKey: 'lot_no',
    header: 'Lot No',
  },
  {
    accessorKey: 'rejected_qty',
    header: 'Rejected Qty',
  },
  {
    accessorKey: 'rejection_type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.getValue('rejection_type') as string
      return (
        <Badge variant="outline">
          {type}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'defect',
    header: 'Defect',
  },
  {
    accessorKey: 'stage',
    header: 'Stage',
  },
  {
    accessorKey: 'responsible_dept',
    header: 'Responsible Dept',
  },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
  },
]

interface RejectionRecordsTableProps {
  data: RejectionRecord[]
}

export function RejectionRecordsTable({ data }: RejectionRecordsTableProps) {
  return <DataTable columns={columns} data={data} />
}
