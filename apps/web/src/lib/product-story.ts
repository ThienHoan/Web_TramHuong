/** Splits off the first sentence, skipping abbreviations such as "TP." or "Q.". */
export function takeSentence(text: string): [string, string] {
  const clean = text.trim();
  for (const match of clean.matchAll(/[.!?…]+(?=\s|$)/gu)) {
    const word = clean.slice(0, match.index).match(/\S+$/)?.[0] ?? '';
    if (word.length <= 3 && word === word.toUpperCase()) continue;
    const end = match.index + match[0].length;
    return [clean.slice(0, end), clean.slice(end).trim()];
  }
  return [clean, ''];
}

type Copy = { vi: string; en: string };
export interface UsageGuide {
  title: Copy;
  steps: { title: Copy; body: Copy }[];
  note: Copy;
}

const enjoy = {
  title: { vi: 'Thưởng hương', en: 'Enjoy the scent' },
  body: {
    vi: 'Để làn khói lan chậm trong phòng. Tắt hẳn tàn lửa sau khi dùng.',
    en: 'Let the smoke drift slowly through the room. Fully extinguish any embers afterwards.',
  },
};
const safety = {
  vi: 'Luôn đặt trên đồ chịu nhiệt, để xa vật dễ cháy, trẻ nhỏ và vật nuôi.',
  en: 'Always use a heat-proof holder, away from flammable items, children and pets.',
};

/** Keyed by category slug. Categories without an entry show no guide. */
export const USAGE_GUIDES: Record<string, UsageGuide> = {
  'nu-tram': {
    title: { vi: 'Thưởng một nụ trầm trong ba bước', en: 'Enjoy an incense cone in three steps' },
    steps: [
      {
        title: { vi: 'Đặt nụ', en: 'Place the cone' },
        body: {
          vi: 'Đặt nụ lên đĩa hoặc lư xông chịu nhiệt, ở nơi thoáng khí.',
          en: 'Set the cone on a heat-proof dish or burner in a well-ventilated spot.',
        },
      },
      {
        title: { vi: 'Châm lửa', en: 'Light it' },
        body: {
          vi: 'Châm vào đầu nhọn của nụ, chờ bén lửa rồi thổi nhẹ để nụ cháy âm ỉ.',
          en: 'Light the pointed tip, wait for it to catch, then gently blow out the flame so it smoulders.',
        },
      },
      enjoy,
    ],
    note: safety,
  },
  'nhang-bot': {
    title: { vi: 'Dùng nhang và bột trầm trong ba bước', en: 'Use incense and agarwood powder in three steps' },
    steps: [
      {
        title: { vi: 'Chuẩn bị', en: 'Prepare' },
        body: {
          vi: 'Cắm nhang vào bát hương hoặc đặt bột trầm lên đồ chịu nhiệt, ở nơi thoáng khí.',
          en: 'Stand the incense in a holder or place the powder on a heat-proof dish in a well-ventilated spot.',
        },
      },
      {
        title: { vi: 'Châm lửa', en: 'Light it' },
        body: {
          vi: 'Châm vào đầu nhang hoặc mồi bột, chờ bén lửa rồi thổi tắt ngọn lửa.',
          en: 'Light the tip of the incense or the powder, wait for it to catch, then blow out the flame.',
        },
      },
      enjoy,
    ],
    note: safety,
  },
};
