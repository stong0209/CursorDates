import exifr from 'exifr';

const EXIF_DATE_KEYS = [
	'DateTimeOriginal',
	'CreateDate',
	'OffsetTimeOriginal',
	'OffsetTime',
	'ModifyDate',
	'DateCreated',
	'PhotoshopDateCreated',
	'XMP:CreateDate',
	'XMP:DateCreated',
];

export async function extractImageDateTaken(filePath: string): Promise<Date | undefined> {
	try {
		const data = await exifr.parse(filePath);
		if (!data || typeof data !== 'object') return undefined;

		for (const key of EXIF_DATE_KEYS) {
			const value = (data as any)[key];
			if (!value) continue;
			if (value instanceof Date) return value;
			const parsed = new Date(String(value));
			if (!isNaN(parsed.getTime())) return parsed;
		}
		return undefined;
	} catch (err) {
		console.error(`exifr error reading ${filePath}:`, (err as Error)?.message || err);
		return undefined;
	}
}
