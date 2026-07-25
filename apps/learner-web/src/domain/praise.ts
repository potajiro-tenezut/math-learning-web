export const praiseMessages = [
  "3問ぜんぶできた！ 今日は天才！",
  "すごい！ さいごまでやりきったね！",
  "かんぺき！ よくがんばりました！",
  "えらすぎる！ 3問クリアだよ！",
  "やったね！ がんばる力がすごい！",
  "今日のきみ、かなりいい感じ！",
  "3問できたきみ、かっこいい！",
  "さいごまでできて、本当にすごい！",
  "その調子！ どんどん強くなってる！",
  "よくできました！ はなまるです！",
  "あきらめなかったの、えらい！",
  "すごすぎ！ 今日のぶんは大せいこう！",
  "できたね！ がんばりが光ってる！",
  "3問クリア！ きみならできると思ってた！",
  "お見事！ 今日もひとつ強くなったね！",
  "すばらしい！ さいごまでバッチリ！",
  "やるじゃん！ ほんとにえらい！",
  "よっしゃ！ 3問ぜんぶ終わった！",
  "今日のがんばり、100点！",
  "すごいぞ！ しっかりやりきったね！",
] as const;

export function pickPraiseMessage(random: () => number = Math.random): string {
  const index = Math.floor(random() * praiseMessages.length);
  return praiseMessages[index] ?? praiseMessages[0];
}
