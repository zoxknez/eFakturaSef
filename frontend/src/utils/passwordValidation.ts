/**
 * Password Validation Utilities
 * Validacija kompleksnosti lozinke sa srpskim porukama
 */

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-5
  errors: string[];
  suggestions: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
}

const defaultRequirements: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false
};

/**
 * Validira lozinku prema zadatim zahtevima
 */
export function validatePassword(
  password: string,
  requirements: Partial<PasswordRequirements> = {}
): PasswordValidationResult {
  const reqs = { ...defaultRequirements, ...requirements };
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Provera dužine
  if (password.length < reqs.minLength) {
    errors.push(`Lozinka mora imati minimum ${reqs.minLength} karaktera`);
  } else {
    score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 0.5;
  }

  // Provera velikih slova
  if (reqs.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Lozinka mora sadržati barem jedno veliko slovo (A-Z)');
  } else if (/[A-Z]/.test(password)) {
    score += 0.5;
  }

  // Provera malih slova
  if (reqs.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Lozinka mora sadržati barem jedno malo slovo (a-z)');
  } else if (/[a-z]/.test(password)) {
    score += 0.5;
  }

  // Provera brojeva
  if (reqs.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Lozinka mora sadržati barem jedan broj (0-9)');
  } else if (/[0-9]/.test(password)) {
    score += 0.5;
  }

  // Provera specijalnih karaktera
  if (reqs.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Lozinka mora sadržati barem jedan specijalni karakter (!@#$%^&*)');
  } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  }

  // Provera čestih lozinki
  if (isCommonPassword(password)) {
    errors.push('Ova lozinka je previše česta i lako se pogađa');
    score = Math.max(0, score - 2);
  }

  // Provera uzastopnih karaktera
  if (/(.)\1{2,}/.test(password)) {
    suggestions.push('Izbegavajte ponavljanje istog karaktera više puta');
    score = Math.max(0, score - 0.5);
  }

  // Provera sekvencijalnih karaktera
  if (hasSequentialChars(password)) {
    suggestions.push('Izbegavajte sekvence poput "123" ili "abc"');
    score = Math.max(0, score - 0.5);
  }

  // Sugestije za poboljšanje
  if (password.length < 12) {
    suggestions.push('Duža lozinka je sigurnija - preporučujemo 12+ karaktera');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    suggestions.push('Dodavanje specijalnih karaktera povećava sigurnost');
  }

  // Odredi snagu
  const normalizedScore = Math.min(5, Math.max(0, score));
  let strength: PasswordValidationResult['strength'];
  
  if (normalizedScore < 1) strength = 'weak';
  else if (normalizedScore < 2) strength = 'fair';
  else if (normalizedScore < 3) strength = 'good';
  else if (normalizedScore < 4) strength = 'strong';
  else strength = 'very-strong';

  return {
    isValid: errors.length === 0,
    score: normalizedScore,
    errors,
    suggestions,
    strength
  };
}

/**
 * Provera da li je lozinka u listi čestih lozinki
 */
function isCommonPassword(password: string): boolean {
  const commonPasswords = [
    'password', 'password123', '123456', '12345678', 'qwerty',
    'abc123', 'monkey', 'master', 'dragon', 'letmein',
    'login', 'admin', 'welcome', 'lozinka', 'sifra',
    'admin123', 'test123', 'pass123', 'user123'
  ];
  return commonPasswords.includes(password.toLowerCase());
}

/**
 * Provera sekvencijalnih karaktera
 */
function hasSequentialChars(password: string): boolean {
  const sequences = [
    '012', '123', '234', '345', '456', '567', '678', '789',
    'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi', 'hij',
    'qwe', 'wer', 'ert', 'rty', 'tyu', 'yui', 'uio', 'iop',
    'asd', 'sdf', 'dfg', 'fgh', 'ghj', 'hjk', 'jkl',
    'zxc', 'xcv', 'cvb', 'vbn', 'bnm'
  ];
  
  const lower = password.toLowerCase();
  return sequences.some(seq => lower.includes(seq));
}

/**
 * Generiše sigurnu nasumičnu lozinku
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  
  // Osiguraj da ima barem po jedan karakter iz svake grupe
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Popuni ostatak
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Promešaj karaktere
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Tekst za prikaz snage lozinke
 */
export function getStrengthLabel(strength: PasswordValidationResult['strength']): string {
  const labels: Record<typeof strength, string> = {
    'weak': 'Slaba',
    'fair': 'Prihvatljiva',
    'good': 'Dobra',
    'strong': 'Jaka',
    'very-strong': 'Veoma jaka'
  };
  return labels[strength];
}

/**
 * Boja za prikaz snage lozinke
 */
export function getStrengthColor(strength: PasswordValidationResult['strength']): string {
  const colors: Record<typeof strength, string> = {
    'weak': 'bg-red-500',
    'fair': 'bg-orange-500',
    'good': 'bg-yellow-500',
    'strong': 'bg-green-500',
    'very-strong': 'bg-emerald-500'
  };
  return colors[strength];
}
