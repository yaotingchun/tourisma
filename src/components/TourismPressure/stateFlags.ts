/**
 * Utility to map Malaysian state IDs to flag asset URLs
 * from the flags_tourisma directory in public/flags_tourisma.
 */
export function getStateFlagUrl(stateId: string): string {
  const normId = (stateId || '').toLowerCase().trim();
  switch (normId) {
    case 'johor':
      return '/flags_tourisma/Flag-Johor.webp';
    case 'kedah':
      return '/flags_tourisma/Flag-Kedah.webp';
    case 'kelantan':
      return '/flags_tourisma/Flag-Kelantan.webp';
    case 'melaka':
      return '/flags_tourisma/Flag-Melaka.svg';
    case 'negeri_sembilan':
      return '/flags_tourisma/Flag-Negeri_Sembilan.svg';
    case 'pahang':
      return '/flags_tourisma/Flag-Pahang.svg';
    case 'penang':
    case 'pulau_pinang':
      return '/flags_tourisma/Flag-Penang.webp';
    case 'perak':
      return '/flags_tourisma/Flag-Perak.webp';
    case 'perlis':
      return '/flags_tourisma/Flag-Perlis.svg';
    case 'sabah':
      return '/flags_tourisma/Flag-Sabah.webp';
    case 'sarawak':
      return '/flags_tourisma/Flag-Sarawak.webp';
    case 'selangor':
      return '/flags_tourisma/Flag-Selangor.webp';
    case 'terengganu':
      return '/flags_tourisma/Flag-Terengganu.webp';
    case 'malaysia':
    case 'kuala_lumpur':
    case 'putrajaya':
    case 'labuan':
    default:
      return '/flags_tourisma/Flag-Malaysia.webp';
  }
}
