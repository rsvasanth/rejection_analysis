import { FinalInspectionRecord } from '@/lib/types'
import { DataTable } from '@/components/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'

const columns: ColumnDef<FinalInspectionRecord>[] = [
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
    accessorKey: 'quantity',
    header: 'Quantity',
  },
  {
    accessorKey: 'inspector',
    header: 'Inspector',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge
          variant={
            status === 'Approved' ? 'default' : status === 'Rejected' ? 'destructive' : 'secondary'
          }
        >
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'defects',
    header: 'Defects',
  },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
  },
]

interface FinalInspectionRecordsTableProps {
  data: FinalInspectionRecord[]
}

export function FinalInspectionRecordsTable({ data }: FinalInspectionRecordsTableProps) {
  return <DataTable columns={columns} data={data} />
}
