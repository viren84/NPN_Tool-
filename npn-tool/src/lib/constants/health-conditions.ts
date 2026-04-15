/** Health condition taxonomy for NHP product classification */
export const HEALTH_CONDITIONS: Record<string, { label: string; color: string }> = {
  immune: { label: "Immune Support", color: "bg-green-100 text-green-700" },
  cardiovascular: { label: "Cardiovascular", color: "bg-red-100 text-red-700" },
  joint_bone: { label: "Joint & Bone", color: "bg-orange-100 text-orange-700" },
  digestive: { label: "Digestive", color: "bg-yellow-100 text-yellow-700" },
  sleep: { label: "Sleep", color: "bg-indigo-100 text-indigo-700" },
  energy: { label: "Energy & Vitality", color: "bg-amber-100 text-amber-700" },
  cognitive: { label: "Brain & Cognitive", color: "bg-purple-100 text-purple-700" },
  skin_hair: { label: "Skin, Hair & Nails", color: "bg-pink-100 text-pink-700" },
  respiratory: { label: "Respiratory", color: "bg-teal-100 text-teal-700" },
  antioxidant: { label: "Antioxidant", color: "bg-emerald-100 text-emerald-700" },
  womens_health: { label: "Women's Health", color: "bg-fuchsia-100 text-fuchsia-700" },
  mens_health: { label: "Men's Health", color: "bg-blue-100 text-blue-700" },
  eye_health: { label: "Eye Health", color: "bg-cyan-100 text-cyan-700" },
  liver_detox: { label: "Liver & Detox", color: "bg-lime-100 text-lime-700" },
  weight_management: { label: "Weight Management", color: "bg-stone-100 text-stone-700" },
  stress_anxiety: { label: "Stress & Anxiety", color: "bg-violet-100 text-violet-700" },
  pain_inflammation: { label: "Pain & Inflammation", color: "bg-rose-100 text-rose-700" },
  prenatal: { label: "Prenatal & Fertility", color: "bg-pink-100 text-pink-800" },
  blood_sugar: { label: "Blood Sugar", color: "bg-sky-100 text-sky-700" },
  general_wellness: { label: "General Wellness", color: "bg-gray-100 text-gray-700" },
};

export const CONDITION_KEYS = Object.keys(HEALTH_CONDITIONS);
