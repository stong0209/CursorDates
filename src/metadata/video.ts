import ffmpeg from 'fluent-ffmpeg';
import ffprobeStatic from 'ffprobe-static';

ffmpeg.setFfprobePath(ffprobeStatic.path);

export async function extractVideoDateTaken(filePath: string): Promise<Date | undefined> {
	return new Promise((resolve) => {
		ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
			if (err || !metadata) {
				return resolve(undefined);
			}
			const tags = metadata.format?.tags || {};
			const streams = Array.isArray(metadata.streams) ? metadata.streams : [];

			const candidates: Array<string | Date | undefined> = [];
			candidates.push(tags.creation_time);
			for (const s of streams) {
				if (s?.tags?.creation_time) candidates.push(s.tags.creation_time);
				if (s?.tags?.com.apple.quicktime.creationdate) candidates.push(s.tags['com.apple.quicktime.creationdate']);
			}

			for (const v of candidates) {
				if (!v) continue;
				if (v instanceof Date && !isNaN(v.getTime())) return resolve(v);
				const d = new Date(String(v));
				if (!isNaN(d.getTime())) return resolve(d);
			}
			return resolve(undefined);
		});
	});
}
