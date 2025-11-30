import { InspectionRecord } from '@/lib/types'
import { DataTable } from '@/components/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'

const columns: ColumnDef<InspectionRecord>[] = [
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
    accessorKey: 'batch_no',
    header: 'Batch No',
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
            status === 'Pass' ? 'default' : status === 'Fail' ? 'destructive' : 'secondary'
          }
        >
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
  },
]

interface LotInspectionRecordsTableProps {
  data: InspectionRecord[]
}

export function LotInspectionRecordsTable({ data }: LotInspectionRecordsTableProps) {
  return <DataTable columns={columns} data={data} />
}
