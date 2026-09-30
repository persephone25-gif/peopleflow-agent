export const USERS = {
  'amina-benali': { id: 'amina-benali', name: 'Amina Benali', role: 'employee', managerId: 'maya-ndiaye' },
  'maya-ndiaye': { id: 'maya-ndiaye', name: "Maya N'Diaye", role: 'manager' },
  'noah-kim': { id: 'noah-kim', name: 'Noah Kim', role: 'hr' },
  'karim-haddad': { id: 'karim-haddad', name: 'Karim Haddad', role: 'production' },
};

export const SKILLS = {
  assembly: 'Assemblage',
  quality: 'Contrôle qualité',
  setup: 'Réglage',
  maintenance: 'Maintenance',
  robotics: 'Robotique',
};

export const EMPLOYEES = [
  {
    id: 'amina-benali',
    name: 'Amina Benali',
    currentRole: 'Opératrice de production',
    department: 'Production',
    managerId: 'maya-ndiaye',
    status: 'Disponible',
    experienceYears: 9,
    careerTarget: 'Line Leader',
    certifications: ['Qualité', 'Sécurité', 'Assemblage', 'Lean Basics'],
    skills: { assembly: 4, quality: 4, setup: 2, maintenance: 1, robotics: 0 },
  },
  {
    id: 'sofia-rossi',
    name: 'Sofia Rossi',
    currentRole: 'Apprentie automatisation',
    department: 'Automatisation',
    managerId: 'maya-ndiaye',
    status: 'En formation',
    experienceYears: 1,
    careerTarget: 'Technicienne automatisation',
    certifications: ['Sécurité', 'PLC Basics', 'Robotique Basics'],
    skills: { assembly: 2, quality: 1, setup: 2, maintenance: 1, robotics: 2 },
  },
  {
    id: 'julien-morel',
    name: 'Julien Morel',
    currentRole: 'Technicien maintenance senior',
    department: 'Maintenance',
    managerId: 'maya-ndiaye',
    status: 'Disponible',
    experienceYears: 32,
    careerTarget: 'Référent technique maintenance',
    certifications: ['Maintenance N2', 'Sécurité', 'X17', 'Tutorat'],
    skills: { assembly: 1, quality: 2, setup: 3, maintenance: 4, robotics: 2 },
  },
  {
    id: 'nora-belaid',
    name: 'Nora Belaïd',
    currentRole: 'Opératrice de production',
    department: 'Production',
    managerId: 'maya-ndiaye',
    status: 'Disponible',
    experienceYears: 6,
    careerTarget: 'Coordinatrice de ligne',
    certifications: ['Sécurité', 'Assemblage'],
    skills: { assembly: 4, quality: 3, setup: 1, maintenance: 0, robotics: 0 },
  },
  {
    id: 'lucas-martin',
    name: 'Lucas Martin',
    currentRole: 'Technicien réglage',
    department: 'Production',
    managerId: 'maya-ndiaye',
    status: 'Absent',
    experienceYears: 12,
    careerTarget: 'Référent technique',
    certifications: ['X17', 'Sécurité', 'Réglage avancé', 'Maintenance N1'],
    skills: { assembly: 2, quality: 2, setup: 4, maintenance: 3, robotics: 2 },
  },
  {
    id: 'paul-dubois',
    name: 'Paul Dubois',
    currentRole: 'Conducteur de ligne',
    department: 'Production',
    managerId: 'maya-ndiaye',
    status: 'Disponible',
    experienceYears: 15,
    careerTarget: 'Référent qualité',
    certifications: ['Qualité avancée', 'Sécurité', 'X17'],
    skills: { assembly: 3, quality: 4, setup: 2, maintenance: 1, robotics: 0 },
  },
  {
    id: 'lina-karim',
    name: 'Lina Karim',
    currentRole: 'Contrôleuse qualité',
    department: 'Qualité',
    status: 'Disponible',
    experienceYears: 11,
    certifications: ['Qualité avancée', 'Sécurité'],
    skills: { assembly: 2, quality: 4, setup: 1, maintenance: 0, robotics: 0 },
  },
  {
    id: 'marc-vidal',
    name: 'Marc Vidal',
    currentRole: 'Technicien réglage',
    department: 'Production',
    status: 'Disponible',
    experienceYears: 10,
    certifications: ['X17', 'Sécurité'],
    skills: { assembly: 2, quality: 2, setup: 4, maintenance: 2, robotics: 1 },
  },
  {
    id: 'fatou-diallo',
    name: 'Fatou Diallo',
    currentRole: 'Contrôleuse qualité',
    department: 'Qualité',
    status: 'Disponible',
    experienceYears: 7,
    certifications: ['Qualité', 'Sécurité'],
    skills: { assembly: 2, quality: 4, setup: 1, maintenance: 0, robotics: 0 },
  },
  {
    id: 'yanis-bernard',
    name: 'Yanis Bernard',
    currentRole: 'Technicien maintenance',
    department: 'Maintenance',
    status: 'Disponible',
    experienceYears: 8,
    certifications: ['Maintenance N1', 'Sécurité'],
    skills: { assembly: 1, quality: 1, setup: 2, maintenance: 3, robotics: 1 },
  },
];

export const EMPLOYEE_BY_ID = Object.fromEntries(EMPLOYEES.map((employee) => [employee.id, employee]));

export const WORKFORCE_POSITIONS = [
  { id: 'l1-setup', lineId: 'line-1', lineName: 'Ligne 1', title: 'Réglage', skillId: 'setup', minimumLevel: 2, certification: 'X17', developmentSuitable: false },
  { id: 'l1-quality', lineId: 'line-1', lineName: 'Ligne 1', title: 'Contrôle qualité', skillId: 'quality', minimumLevel: 3, certification: null, developmentSuitable: false },
  { id: 'l1-assembly', lineId: 'line-1', lineName: 'Ligne 1', title: 'Assemblage', skillId: 'assembly', minimumLevel: 3, certification: null, developmentSuitable: false },
  { id: 'l2-setup', lineId: 'line-2', lineName: 'Ligne 2', title: 'Réglage avancé', skillId: 'setup', minimumLevel: 3, certification: 'X17', developmentSuitable: false },
  { id: 'l2-quality', lineId: 'line-2', lineName: 'Ligne 2', title: 'Contrôle qualité', skillId: 'quality', minimumLevel: 3, certification: null, developmentSuitable: false },
  { id: 'l2-maintenance', lineId: 'line-2', lineName: 'Ligne 2', title: 'Maintenance N1', skillId: 'maintenance', minimumLevel: 2, certification: null, developmentSuitable: false },
  { id: 'l3-setup', lineId: 'line-3', lineName: 'Ligne 3', title: 'Réglage X17', skillId: 'setup', minimumLevel: 2, certification: 'X17', developmentSuitable: true },
  { id: 'l3-quality', lineId: 'line-3', lineName: 'Ligne 3', title: 'Contrôle qualité', skillId: 'quality', minimumLevel: 3, certification: null, developmentSuitable: false },
  { id: 'l3-maintenance', lineId: 'line-3', lineName: 'Ligne 3', title: 'Maintenance N1', skillId: 'maintenance', minimumLevel: 2, certification: null, developmentSuitable: false },
  { id: 'l4-setup', lineId: 'line-4', lineName: 'Ligne 4', title: 'Réglage', skillId: 'setup', minimumLevel: 3, certification: null, developmentSuitable: false },
  { id: 'l4-quality', lineId: 'line-4', lineName: 'Ligne 4', title: 'Qualité / support', skillId: 'quality', minimumLevel: 2, certification: null, developmentSuitable: false },
];

export const INITIAL_ASSIGNMENTS = {
  'l1-setup': 'paul-dubois',
  'l1-quality': 'amina-benali',
  'l1-assembly': 'nora-belaid',
  'l2-setup': 'julien-morel',
  'l2-quality': 'lina-karim',
  'l2-maintenance': 'yanis-bernard',
  'l3-setup': null,
  'l3-quality': 'fatou-diallo',
  'l3-maintenance': 'yanis-bernard',
  'l4-setup': 'marc-vidal',
  'l4-quality': 'paul-dubois',
};

export const EMPLOYEE_PLANNING = {
  'amina-benali': [
    { date: '2026-10-14', start: '06:00', end: '14:00', type: 'work', label: 'Production · Ligne 1' },
    { date: '2026-10-15', start: '06:00', end: '14:00', type: 'work', label: 'Production · Ligne 1' },
    { date: '2026-10-16', start: '06:00', end: '14:00', type: 'work', label: 'Production · Ligne 1' },
  ],
};

export const JOB_PROFILES = {
  'line-leader': {
    id: 'line-leader',
    title: 'Line Leader',
    description: 'Coordination opérationnelle, animation terrain et suivi qualité.',
    minimumExperienceYears: 5,
    requiredSkills: { assembly: 3, quality: 3, setup: 3 },
    preferredCertifications: ['X17', 'Qualité avancée', 'Tutorat'],
  },
  'quality-specialist': {
    id: 'quality-specialist',
    title: 'Quality Specialist',
    description: 'Référent qualité, analyse des écarts et support aux lignes.',
    minimumExperienceYears: 4,
    requiredSkills: { quality: 4, assembly: 2 },
    preferredCertifications: ['Qualité avancée'],
  },
};

export function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
