/**
 * Utility to export an array of objects to a CSV file.
 */
export function exportToCSV(data: any[], fileName: string, headerMap?: Record<string, string>) {
    if (!data || data.length === 0) {
        console.error("No data to export");
        return;
    }

    // 1. Get keys to export
    const keys = headerMap ? Object.keys(headerMap) : Object.keys(data[0]);
    const headers = headerMap ? Object.values(headerMap) : keys;

    // 2. Map data to rows
    const csvRows = [
        headers.join(','), // header row
        ...data.map(row =>
            keys.map(key => {
                let val = row[key];

                // Format numbers to 2 decimal places if they are floats
                if (typeof val === 'number' && !Number.isInteger(val)) {
                    val = val.toFixed(2);
                }

                // Handle null/undefined
                if (val === null || val === undefined) val = '';

                // Handle strings with commas or quotes
                const strVal = String(val);
                if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
                    return `"${strVal.replace(/"/g, '""')}"`;
                }
                return strVal;
            }).join(',')
        )
    ];

    // 3. Create blob and download
    const BOM = '\uFEFF';
    const csvContent = BOM + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    // Ensure filename ends with .csv
    // Regex allows alphanumeric, underscore, dash, and dot
    const cleanFileName = fileName.replace(/[^\w\s-.]/gi, '_');
    const finalFileName = cleanFileName.toLowerCase().endsWith('.csv')
        ? cleanFileName
        : `${cleanFileName}.csv`;

    const link = document.createElement("a");
    link.href = url;
    link.download = finalFileName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
