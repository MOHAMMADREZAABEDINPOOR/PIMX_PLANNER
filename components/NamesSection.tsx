import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  Clock3,
  Edit3,
  Home,
  History,
  Plus,
  Save,
  Search,
  Tag,
  Trash2,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { PersonRelation, PlannedFamily, PlannedPerson } from '../types';
import { calendarModeStorage, formatAppDate, getCalendarModeLabel, storage } from '../utils';

type EntryMode = 'single' | 'family';
type ModalTarget = { type: 'family'; id: string; mode: 'edit' | 'details' } | { type: 'person'; id: string; mode: 'edit' } | null;

type PersonDraft = {
  fullName: string;
  relation: PersonRelation;
  customRelationTag: string;
  futurePlan: string;
};

type PersonFormState = PersonDraft & {
  familyId: string;
};

type FamilyFormState = {
  name: string;
  description: string;
  members: PersonDraft[];
};

const relationLabels: Record<PersonRelation, string> = {
  independent: 'فرد مستقل',
  family_head: 'مرد خانواده',
  spouse: 'زن خانواده',
  son: 'پسر',
  daughter: 'دختر',
  daughter_in_law: 'عروس',
  son_in_law: 'داماد',
  grandchild: 'نوه',
  mother: 'مادر',
  father: 'پدر',
  other: 'سایر'
};

const familyRelationOptions: PersonRelation[] = [
  'family_head',
  'spouse',
  'son',
  'daughter',
  'daughter_in_law',
  'son_in_law',
  'grandchild',
  'mother',
  'father',
  'other'
];

const allRelationOptions: PersonRelation[] = ['independent', ...familyRelationOptions];

const quickMemberTemplates: Array<{ relation: PersonRelation; label: string }> = [
  { relation: 'family_head', label: 'مرد خانواده' },
  { relation: 'spouse', label: 'زن خانواده' },
  { relation: 'son', label: 'پسر' },
  { relation: 'daughter', label: 'دختر' },
  { relation: 'daughter_in_law', label: 'عروس' },
  { relation: 'son_in_law', label: 'داماد' },
  { relation: 'grandchild', label: 'نوه' },
  { relation: 'mother', label: 'مادر' },
  { relation: 'father', label: 'پدر' },
  { relation: 'other', label: 'سایر' }
];

const emptyPersonDraft = (relation: PersonRelation = 'other'): PersonDraft => ({
  fullName: '',
  relation,
  customRelationTag: '',
  futurePlan: ''
});

const defaultPersonForm = (): PersonFormState => ({
  ...emptyPersonDraft('independent'),
  familyId: ''
});

const defaultFamilyForm = (): FamilyFormState => ({
  name: '',
  description: '',
  members: [emptyPersonDraft('family_head'), emptyPersonDraft('spouse')]
});

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

const safeDate = (value?: string) => {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const uniqueHistory = (items: unknown): string[] => {
  if (!Array.isArray(items)) return [];
  return Array.from(new Set(items.filter(item => typeof item === 'string') as string[]));
};

const normalizeFamilies = (value: unknown): PlannedFamily[] => {
  const list = Array.isArray(value) ? value : [];
  return list
    .filter(item => item && typeof item === 'object' && (item as Partial<PlannedFamily>).id && (item as Partial<PlannedFamily>).name)
    .map(item => {
      const family = item as PlannedFamily;
      const createdAt = family.createdAt || new Date().toISOString();
      const updatedAt = family.updatedAt || createdAt;
      return {
        id: String(family.id),
        name: String(family.name || '').trim(),
        description: family.description || '',
        createdAt,
        updatedAt,
        editHistory: uniqueHistory(family.editHistory)
      };
    })
    .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
};

const normalizePeople = (value: unknown): PlannedPerson[] => {
  const list = Array.isArray(value) ? value : [];
  return list
    .filter(item => item && typeof item === 'object' && (item as Partial<PlannedPerson>).id && (item as Partial<PlannedPerson>).fullName)
    .map(item => {
      const person = item as PlannedPerson;
      const relation = allRelationOptions.includes(person.relation) ? person.relation : 'independent';
      const createdAt = person.createdAt || new Date().toISOString();
      const updatedAt = person.updatedAt || createdAt;
      return {
        id: String(person.id),
        fullName: String(person.fullName || '').trim(),
        relation,
        customRelationTag: person.customRelationTag || '',
        familyId: person.familyId || '',
        futurePlan: person.futurePlan || '',
        createdAt,
        updatedAt,
        editHistory: uniqueHistory(person.editHistory)
      };
    })
    .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
};

const relationText = (person: Pick<PlannedPerson, 'relation' | 'customRelationTag'> | PersonDraft) =>
  person.relation === 'other' && person.customRelationTag?.trim()
    ? person.customRelationTag.trim()
    : relationLabels[person.relation];

const appendEdit = (history: string[] | undefined, timestamp: string) => [...uniqueHistory(history), timestamp];

export const NamesSection: React.FC = () => {
  const [families, setFamilies] = useState<PlannedFamily[]>([]);
  const [people, setPeople] = useState<PlannedPerson[]>([]);
  const [entryMode, setEntryMode] = useState<EntryMode>('single');
  const [personForm, setPersonForm] = useState<PersonFormState>(() => defaultPersonForm());
  const [familyForm, setFamilyForm] = useState<FamilyFormState>(() => defaultFamilyForm());
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [calendarMode, setCalendarMode] = useState(() => calendarModeStorage.get());
  const [modalTarget, setModalTarget] = useState<ModalTarget>(null);
  const [editPersonForm, setEditPersonForm] = useState<PersonFormState>(() => defaultPersonForm());
  const [editFamilyForm, setEditFamilyForm] = useState<{ name: string; description: string }>({ name: '', description: '' });

  useEffect(() => {
    setFamilies(normalizeFamilies(storage.get(storage.keys.PLANNED_FAMILIES, [])));
    setPeople(normalizePeople(storage.get(storage.keys.PLANNED_PEOPLE, [])));
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const mode = (event as CustomEvent).detail;
      if (mode === 'jalali' || mode === 'gregorian') setCalendarMode(mode);
    };
    window.addEventListener('planner-calendar-mode-change', handler);
    return () => window.removeEventListener('planner-calendar-mode-change', handler);
  }, []);

  const familiesById = useMemo(() => {
    const map: Record<string, PlannedFamily> = {};
    families.forEach(family => {
      map[family.id] = family;
    });
    return map;
  }, [families]);

  const peopleByFamily = useMemo(() => {
    const map: Record<string, PlannedPerson[]> = {};
    people.forEach(person => {
      if (!person.familyId) return;
      if (!map[person.familyId]) map[person.familyId] = [];
      map[person.familyId].push(person);
    });
    Object.values(map).forEach(items =>
      items.sort((a, b) => {
        const order = familyRelationOptions.indexOf(a.relation) - familyRelationOptions.indexOf(b.relation);
        return order !== 0 ? order : a.createdAt.localeCompare(b.createdAt);
      })
    );
    return map;
  }, [people]);

  const filteredFamilies = useMemo(() => {
    const term = query.trim().toLowerCase();
    return families.filter(family => {
      const members = peopleByFamily[family.id] || [];
      const matchesFilter = selectedFamilyId === 'all' || selectedFamilyId === family.id;
      const matchesQuery =
        !term ||
        family.name.toLowerCase().includes(term) ||
        (family.description || '').toLowerCase().includes(term) ||
        members.some(member =>
          [member.fullName, member.futurePlan, relationText(member)]
            .join(' ')
            .toLowerCase()
            .includes(term)
        );
      return matchesFilter && matchesQuery;
    });
  }, [families, peopleByFamily, query, selectedFamilyId]);

  const filteredSingles = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (selectedFamilyId !== 'all' && selectedFamilyId !== 'single') return [];
    return people.filter(person => {
      if (person.familyId) return false;
      const text = [person.fullName, person.futurePlan, relationText(person)].join(' ').toLowerCase();
      return !term || text.includes(term);
    });
  }, [people, query, selectedFamilyId]);

  const mixedCards = useMemo(() => {
    return [
      ...filteredFamilies.map(family => ({
        type: 'family' as const,
        id: family.id,
        updatedAt: family.updatedAt || family.createdAt,
        family
      })),
      ...filteredSingles.map(person => ({
        type: 'person' as const,
        id: person.id,
        updatedAt: person.updatedAt || person.createdAt,
        person
      }))
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [filteredFamilies, filteredSingles]);

  const independentCount = people.filter(person => !person.familyId).length;
  const plannedCount = people.filter(person => person.futurePlan.trim()).length;
  const modalTargetFamily = modalTarget?.type === 'family' ? familiesById[modalTarget.id] : null;
  const modalTargetPerson = modalTarget?.type === 'person' ? people.find(person => person.id === modalTarget.id) || null : null;

  const saveFamilies = (next: PlannedFamily[]) => {
    const normalized = normalizeFamilies(next);
    setFamilies(normalized);
    storage.set(storage.keys.PLANNED_FAMILIES, normalized);
  };

  const savePeople = (next: PlannedPerson[]) => {
    const normalized = normalizePeople(next);
    setPeople(normalized);
    storage.set(storage.keys.PLANNED_PEOPLE, normalized);
  };

  const dateLabel = (value?: string) => formatAppDate(safeDate(value), calendarMode);

  const historyLabels = (createdAt: string, updatedAt: string, history?: string[]) => {
    const edits = uniqueHistory(history);
    return {
      created: dateLabel(createdAt),
      updated: dateLabel(updatedAt),
      editCount: edits.length,
      edits: edits.map(item => dateLabel(item))
    };
  };

  const addFamilyMemberDraft = (relation: PersonRelation = 'other') => {
    setFamilyForm(prev => ({ ...prev, members: [...prev.members, emptyPersonDraft(relation)] }));
  };

  const updateFamilyMemberDraft = (index: number, patch: Partial<PersonDraft>) => {
    setFamilyForm(prev => ({
      ...prev,
      members: prev.members.map((member, i) => (i === index ? { ...member, ...patch } : member))
    }));
  };

  const removeFamilyMemberDraft = (index: number) => {
    setFamilyForm(prev => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index)
    }));
  };

  const handleFamilySubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const name = familyForm.name.trim();
    if (!name) return;
    const memberDrafts = familyForm.members.filter(member => member.fullName.trim());
    const now = new Date().toISOString();
    const newFamily: PlannedFamily = {
      id: uid(),
      name,
      description: familyForm.description.trim(),
      createdAt: now,
      updatedAt: now,
      editHistory: []
    };
    const newPeople: PlannedPerson[] = memberDrafts.map(member => ({
      id: uid(),
      fullName: member.fullName.trim(),
      relation: member.relation === 'independent' ? 'other' : member.relation,
      customRelationTag: member.relation === 'other' ? member.customRelationTag.trim() : '',
      familyId: newFamily.id,
      futurePlan: member.futurePlan.trim(),
      createdAt: now,
      updatedAt: now,
      editHistory: []
    }));
    saveFamilies([newFamily, ...families]);
    savePeople([...newPeople, ...people]);
    setFamilyForm(defaultFamilyForm());
  };

  const handleSingleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const fullName = personForm.fullName.trim();
    if (!fullName) return;
    const now = new Date().toISOString();
    const familyId = personForm.familyId || '';
    const newPerson: PlannedPerson = {
      id: uid(),
      fullName,
      relation: familyId ? (personForm.relation === 'independent' ? 'other' : personForm.relation) : 'independent',
      customRelationTag: familyId && personForm.relation === 'other' ? personForm.customRelationTag.trim() : '',
      familyId,
      futurePlan: personForm.futurePlan.trim(),
      createdAt: now,
      updatedAt: now,
      editHistory: []
    };
    savePeople([newPerson, ...people]);
    setPersonForm(prev => ({
      ...defaultPersonForm(),
      familyId: prev.familyId,
      relation: prev.familyId ? 'other' : 'independent'
    }));
  };

  const deleteFamily = (familyId: string) => {
    saveFamilies(families.filter(family => family.id !== familyId));
    savePeople(people.map(person => (person.familyId === familyId ? { ...person, familyId: '', relation: 'independent', customRelationTag: '' } : person)));
    if (selectedFamilyId === familyId) setSelectedFamilyId('all');
    if (personForm.familyId === familyId) setPersonForm(defaultPersonForm());
  };

  const deletePerson = (personId: string) => {
    savePeople(people.filter(person => person.id !== personId));
  };

  const openFamilyEdit = (family: PlannedFamily) => {
    setEditFamilyForm({ name: family.name, description: family.description || '' });
    setModalTarget({ type: 'family', id: family.id, mode: 'edit' });
  };

  const openFamilyDetails = (family: PlannedFamily) => {
    setModalTarget({ type: 'family', id: family.id, mode: 'details' });
  };

  const openPersonEdit = (person: PlannedPerson) => {
    setEditPersonForm({
      fullName: person.fullName,
      relation: person.relation,
      customRelationTag: person.customRelationTag || '',
      familyId: person.familyId || '',
      futurePlan: person.futurePlan || ''
    });
    setModalTarget({ type: 'person', id: person.id, mode: 'edit' });
  };

  const closeEditModal = () => {
    setModalTarget(null);
    setEditPersonForm(defaultPersonForm());
    setEditFamilyForm({ name: '', description: '' });
  };

  const saveFamilyEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!modalTargetFamily || !editFamilyForm.name.trim()) return;
    const now = new Date().toISOString();
    saveFamilies(
      families.map(family =>
        family.id === modalTargetFamily.id
          ? {
              ...family,
              name: editFamilyForm.name.trim(),
              description: editFamilyForm.description.trim(),
              updatedAt: now,
              editHistory: appendEdit(family.editHistory, now)
            }
          : family
      )
    );
    closeEditModal();
  };

  const savePersonEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!modalTargetPerson || !editPersonForm.fullName.trim()) return;
    const now = new Date().toISOString();
    const familyId = editPersonForm.familyId || '';
    savePeople(
      people.map(person =>
        person.id === modalTargetPerson.id
          ? {
              ...person,
              fullName: editPersonForm.fullName.trim(),
              relation: familyId ? (editPersonForm.relation === 'independent' ? 'other' : editPersonForm.relation) : 'independent',
              customRelationTag: familyId && editPersonForm.relation === 'other' ? editPersonForm.customRelationTag.trim() : '',
              familyId,
              futurePlan: editPersonForm.futurePlan.trim(),
              updatedAt: now,
              editHistory: appendEdit(person.editHistory, now)
            }
          : person
      )
    );
    closeEditModal();
  };

  const renderTimePanel = (createdAt: string, updatedAt: string, history?: string[]) => {
    const meta = historyLabels(createdAt, updatedAt, history);
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-3">
        <div className="grid grid-cols-1 gap-2 text-[11px] text-slate-300 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-cyan-300" />
            <span>ثبت: {meta.created}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock3 className="h-3.5 w-3.5 text-emerald-300" />
            <span>آخرین تغییر: {meta.updated}</span>
          </div>
          <div className="flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-amber-300" />
            <span>{meta.editCount} بار ویرایش</span>
          </div>
        </div>
        {meta.edits.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {meta.edits.slice(-6).map((item, index) => (
              <span key={`${item}-${index}`} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300">
                ویرایش {index + 1}: {item}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderPersonCard = (person: PlannedPerson, compact = false) => (
    <div key={person.id} className="flex h-full min-h-[520px] flex-col rounded-[28px] border border-white/10 bg-slate-950/85 p-5 shadow-[0_22px_70px_-42px_rgba(34,211,238,0.42)] transition hover:border-cyan-300/40">
      <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-lg font-black text-white md:text-xl">{person.fullName}</div>
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-100">
              {relationText(person)}
            </span>
            {person.familyId && familiesById[person.familyId] && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-100">
                <Home className="h-3 w-3" />
                {familiesById[person.familyId].name}
              </span>
            )}
          </div>
          {person.futurePlan ? (
            <p className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm leading-relaxed text-slate-200">
              {person.futurePlan}
            </p>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-white/10 p-3 text-sm text-slate-500">
              برای این فرد هنوز برنامه آینده نوشته نشده است.
            </div>
          )}
          {!compact && <div className="mt-auto pt-3">{renderTimePanel(person.createdAt, person.updatedAt, person.editHistory)}</div>}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => openPersonEdit(person)}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-500/20"
          >
            <Edit3 className="h-4 w-4" />
            ویرایش
          </button>
          <button
            onClick={() => deletePerson(person.id)}
            className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-2 text-rose-100 transition hover:bg-rose-500/20"
            title="حذف"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderFamilyCard = (family: PlannedFamily) => {
    const members = peopleByFamily[family.id] || [];
    const visibleMembers = members.slice(0, 3);
    const hiddenMembersCount = Math.max(0, members.length - visibleMembers.length);
    return (
      <div className="flex h-full min-h-[520px] flex-col rounded-[28px] border border-white/10 bg-slate-950/85 p-5 shadow-[0_22px_70px_-42px_rgba(34,211,238,0.55)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-2xl font-black text-white">{family.name}</div>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
                خانواده {members.length} نفره
              </span>
            </div>
            {family.description && <p className="mt-2 text-sm leading-relaxed text-slate-300">{family.description}</p>}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => {
                setEntryMode('single');
                setPersonForm(prev => ({ ...prev, familyId: family.id, relation: prev.relation === 'independent' ? 'other' : prev.relation }));
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-500/20"
            >
              <UserPlus className="h-4 w-4" />
              افزودن عضو
            </button>
            <button
              onClick={() => openFamilyEdit(family)}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-500/20"
            >
              <Edit3 className="h-4 w-4" />
              ویرایش
            </button>
            <button
              onClick={() => deleteFamily(family.id)}
              className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-2 text-rose-100 transition hover:bg-rose-500/20"
              title="حذف خانواده"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4">{renderTimePanel(family.createdAt, family.updatedAt, family.editHistory)}</div>

        <div className="mt-5 flex flex-1 flex-col rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="mb-4 flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-cyan-300" />
            <span className="font-bold">اعضای خانواده</span>
            {hiddenMembersCount > 0 && (
              <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100">
                +{hiddenMembersCount} نفر دیگر
              </span>
            )}
          </div>
          {members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
              هنوز عضوی برای این خانواده ثبت نشده است.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {visibleMembers.map(member => (
                <div key={member.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-black text-white">{member.fullName}</div>
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300">
                        <Tag className="h-3 w-3 text-amber-300" />
                        {relationText(member)}
                      </div>
                    </div>
                    <button
                      onClick={() => openPersonEdit(member)}
                      className="shrink-0 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100"
                    >
                      ویرایش
                    </button>
                  </div>
                  {member.futurePlan && <p className="mt-3 line-clamp-4 text-xs leading-relaxed text-slate-300">{member.futurePlan}</p>}
                  <div className="mt-3 text-[10px] text-slate-500">آخرین تغییر: {dateLabel(member.updatedAt)}</div>
                </div>
              ))}
            </div>
          )}
          {members.length > 3 && (
            <button
              onClick={() => openFamilyDetails(family)}
              className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-500/20"
            >
              مشاهده جزئیات کامل خانواده
            </button>
          )}
        </div>
      </div>
    );
  };

  const memberEditor = (member: PersonDraft, index: number) => (
    <div key={index} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-bold text-white">عضو {index + 1}</div>
        <button
          type="button"
          onClick={() => removeFamilyMemberDraft(index)}
          className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-2 text-rose-100"
          title="حذف عضو"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
          placeholder="نام و نام خانوادگی"
          value={member.fullName}
          onChange={event => updateFamilyMemberDraft(index, { fullName: event.target.value })}
        />
        <select
          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
          value={member.relation}
          onChange={event => updateFamilyMemberDraft(index, { relation: event.target.value as PersonRelation, customRelationTag: '' })}
        >
          {familyRelationOptions.map(relation => (
            <option key={relation} value={relation}>
              {relationLabels[relation]}
            </option>
          ))}
        </select>
      </div>
      {member.relation === 'other' && (
        <input
          className="mt-3 w-full rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-50 placeholder:text-amber-100/50 focus:border-amber-300 focus:outline-none"
          placeholder="تگ نسبت سایر، مثلا برادرزاده یا دوست خانوادگی"
          value={member.customRelationTag}
          onChange={event => updateFamilyMemberDraft(index, { customRelationTag: event.target.value })}
        />
      )}
      <textarea
        className="mt-3 min-h-24 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
        placeholder="برنامه آینده این عضو"
        value={member.futurePlan}
        onChange={event => updateFamilyMemberDraft(index, { futurePlan: event.target.value })}
      />
    </div>
  );

  return (
    <div className="space-y-5 md:space-y-7 animate-enter" dir="rtl">
      <div className="relative overflow-hidden rounded-[28px] border border-cyan-500/20 bg-slate-950/90 p-5 md:p-7 shadow-[0_24px_80px_-40px_rgba(34,211,238,0.75)]">
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-cyan-500/18 blur-[120px]"></div>
          <div className="absolute right-10 bottom-[-90px] h-72 w-72 rounded-full bg-emerald-500/12 blur-[140px]"></div>
        </div>
        <div className="relative grid grid-cols-1 gap-5 lg:grid-cols-[1.25fr_0.85fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-white/5 px-3 py-1 text-xs text-cyan-100">
              <Users className="h-4 w-4 text-cyan-300" />
              اسامی و برنامه‌ریزی خانواده
            </div>
            <div>
              <h2 className="text-2xl font-black text-white md:text-4xl">مدیریت خانواده‌ها و افراد</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                یک بخش واحد برای افزودن فرد تکی یا خانواده کامل؛ خانواده‌ها با کارت‌های مرتب نمایش داده می‌شوند و ویرایش‌ها با تاریخچه ذخیره می‌شوند.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4">
                <div className="text-xs text-cyan-100">کل افراد</div>
                <div className="mt-1 text-3xl font-black text-white">{people.length}</div>
              </div>
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
                <div className="text-xs text-emerald-100">خانواده‌ها</div>
                <div className="mt-1 text-3xl font-black text-white">{families.length}</div>
              </div>
              <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
                <div className="text-xs text-amber-100">افراد تکی</div>
                <div className="mt-1 text-3xl font-black text-white">{independentCount}</div>
              </div>
              <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4">
                <div className="text-xs text-rose-100">دارای برنامه</div>
                <div className="mt-1 text-3xl font-black text-white">{plannedCount}</div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/75 p-4">
            <div className="flex items-center gap-2 text-white">
              <CalendarDays className="h-5 w-5 text-cyan-300" />
              <span className="font-bold">نمای تاریخ</span>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-slate-400">حالت فعلی تاریخ‌ها</div>
              <div className="mt-1 text-2xl font-black text-white">{getCalendarModeLabel(calendarMode)}</div>
              <div className="mt-3 text-sm text-cyan-100">{formatAppDate(new Date(), calendarMode)}</div>
            </div>
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-slate-300">
              تاریخ ثبت، آخرین ویرایش، تعداد ویرایش‌ها و لیست تاریخ ویرایش‌ها روی کارت‌ها نمایش داده می‌شود.
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-[28px] border border-white/10 bg-slate-950/85 p-4 md:p-5">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-white">
              <Plus className="h-5 w-5 text-cyan-300" />
              <span className="font-bold">افزودن خانواده و فرد</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">نوع ثبت را انتخاب کن؛ وقتی خانواده را بزنی فرم اعضا بزرگ‌تر و کامل‌تر می‌شود.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1 text-xs font-bold text-slate-200">
            <button
              onClick={() => setEntryMode('single')}
              className={`rounded-xl px-4 py-2 transition ${entryMode === 'single' ? 'bg-cyan-500 text-white' : 'hover:bg-white/5'}`}
            >
              فرد تکی
            </button>
            <button
              onClick={() => setEntryMode('family')}
              className={`rounded-xl px-4 py-2 transition ${entryMode === 'family' ? 'bg-emerald-500 text-white' : 'hover:bg-white/5'}`}
            >
              خانواده
            </button>
          </div>
        </div>

        {entryMode === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-start">
            <div className="space-y-3">
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
                placeholder="نام فرد"
                value={personForm.fullName}
                onChange={event => setPersonForm(prev => ({ ...prev, fullName: event.target.value }))}
                required
              />
              <select
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
                value={personForm.familyId}
                onChange={event =>
                  setPersonForm(prev => ({
                    ...prev,
                    familyId: event.target.value,
                    relation: event.target.value ? (prev.relation === 'independent' ? 'other' : prev.relation) : 'independent',
                    customRelationTag: event.target.value ? prev.customRelationTag : ''
                  }))
                }
              >
                <option value="">فرد تکی / بدون خانواده</option>
                {families.map(family => (
                  <option key={family.id} value={family.id}>
                    افزودن به {family.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              {personForm.familyId && (
                <>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
                    value={personForm.relation}
                    onChange={event => setPersonForm(prev => ({ ...prev, relation: event.target.value as PersonRelation, customRelationTag: '' }))}
                  >
                    {familyRelationOptions.map(relation => (
                      <option key={relation} value={relation}>
                        {relationLabels[relation]}
                      </option>
                    ))}
                  </select>
                  {personForm.relation === 'other' && (
                    <input
                      className="w-full rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-50 placeholder:text-amber-100/50 focus:border-amber-300 focus:outline-none"
                      placeholder="تگ نسبت سایر"
                      value={personForm.customRelationTag}
                      onChange={event => setPersonForm(prev => ({ ...prev, customRelationTag: event.target.value }))}
                    />
                  )}
                </>
              )}
              <textarea
                className="min-h-24 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
                placeholder="برنامه آینده این فرد"
                value={personForm.futurePlan}
                onChange={event => setPersonForm(prev => ({ ...prev, futurePlan: event.target.value }))}
              />
            </div>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-[0_14px_35px_-18px_rgba(34,211,238,0.9)] transition hover:bg-cyan-400"
            >
              <UserPlus className="h-4 w-4" />
              ثبت فرد
            </button>
          </form>
        ) : (
          <form onSubmit={handleFamilySubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
                placeholder="نام خانواده، مثلا خانواده رضایی"
                value={familyForm.name}
                onChange={event => setFamilyForm(prev => ({ ...prev, name: event.target.value }))}
                required
              />
              <input
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
                placeholder="توضیح کوتاه اختیاری"
                value={familyForm.description}
                onChange={event => setFamilyForm(prev => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {quickMemberTemplates.map(template => (
                <button
                  key={template.relation + template.label}
                  type="button"
                  onClick={() => addFamilyMemberDraft(template.relation)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
                >
                  + {template.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {familyForm.members.map(memberEditor)}
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-[0_14px_35px_-18px_rgba(16,185,129,0.9)] transition hover:bg-emerald-400"
            >
              <Save className="h-4 w-4" />
              ثبت خانواده و اعضا
            </button>
          </form>
        )}
      </section>

      <section className="space-y-5">
        <div className="rounded-[24px] border border-white/10 bg-slate-950/85 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5 text-cyan-300" />
              <span className="font-bold">لیست اسامی و خانواده‌ها</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-3 pr-9 text-sm text-white focus:border-cyan-400/70 focus:outline-none sm:w-64"
                  placeholder="جستجو در خانواده، افراد، برنامه‌ها"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                />
              </div>
              <select
                className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
                value={selectedFamilyId}
                onChange={event => setSelectedFamilyId(event.target.value)}
              >
                <option value="all">همه</option>
                <option value="single">افراد تکی</option>
                {families.map(family => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {mixedCards.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-slate-950/70 px-4 py-12 text-center text-sm text-slate-500">
            چیزی با این فیلتر ثبت نشده است.
          </div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-2">
            {mixedCards.map(card => (
              <div key={`${card.type}-${card.id}`} className="h-full">
                {card.type === 'family' ? renderFamilyCard(card.family) : renderPersonCard(card.person)}
              </div>
            ))}
          </div>
        )}
      </section>

      {modalTarget &&
        createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl" onClick={closeEditModal}></div>
          <div className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.65)] md:p-8">
            <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_20%_30%,rgba(34,211,238,0.12),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.1),transparent_35%)] pointer-events-none"></div>
            <div className="relative mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
                  <Edit3 className="h-4 w-4" />
                  ویرایش دقیق
                </div>
                <h3 className="mt-2 text-2xl font-black text-white">
                  {modalTarget.type === 'family'
                    ? modalTarget.mode === 'details'
                      ? 'جزئیات خانواده'
                      : 'ویرایش خانواده'
                    : 'ویرایش فرد'}
                </h3>
              </div>
              <button
                onClick={closeEditModal}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:text-white"
                aria-label="بستن"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative rounded-[24px] border border-white/10 bg-slate-950/60 p-4 md:p-5">
              {modalTarget.type === 'family' && modalTarget.mode === 'details' && modalTargetFamily ? (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-3xl font-black text-white">{modalTargetFamily.name}</div>
                      {modalTargetFamily.description && <p className="mt-2 text-sm leading-relaxed text-slate-300">{modalTargetFamily.description}</p>}
                    </div>
                    <button
                      onClick={() => openFamilyEdit(modalTargetFamily)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-500/20"
                    >
                      <Edit3 className="h-4 w-4" />
                      ویرایش خانواده
                    </button>
                  </div>
                  {renderTimePanel(modalTargetFamily.createdAt, modalTargetFamily.updatedAt, modalTargetFamily.editHistory)}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {(peopleByFamily[modalTargetFamily.id] || []).map(member => (
                      <div key={member.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-lg font-black text-white">{member.fullName}</div>
                            <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-300">
                              <Tag className="h-3 w-3 text-amber-300" />
                              {relationText(member)}
                            </div>
                          </div>
                          <button
                            onClick={() => openPersonEdit(member)}
                            className="shrink-0 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100"
                          >
                            ویرایش
                          </button>
                        </div>
                        {member.futurePlan && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{member.futurePlan}</p>}
                        <div className="mt-3 text-[10px] text-slate-500">آخرین تغییر: {dateLabel(member.updatedAt)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : modalTarget.type === 'family' && modalTargetFamily ? (
              <form onSubmit={saveFamilyEdit} className="space-y-4">
                <input
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
                  value={editFamilyForm.name}
                  onChange={event => setEditFamilyForm(prev => ({ ...prev, name: event.target.value }))}
                  required
                />
                <textarea
                  className="min-h-28 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
                  value={editFamilyForm.description}
                  onChange={event => setEditFamilyForm(prev => ({ ...prev, description: event.target.value }))}
                  placeholder="توضیح خانواده"
                />
                {renderTimePanel(modalTargetFamily.createdAt, modalTargetFamily.updatedAt, modalTargetFamily.editHistory)}
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-black text-white" type="submit">
                  <Save className="h-4 w-4" />
                  ذخیره و ثبت تاریخ ویرایش
                </button>
              </form>
            ) : modalTargetPerson ? (
              <form onSubmit={savePersonEdit} className="space-y-4">
                <input
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
                  value={editPersonForm.fullName}
                  onChange={event => setEditPersonForm(prev => ({ ...prev, fullName: event.target.value }))}
                  required
                />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <select
                    className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
                    value={editPersonForm.familyId}
                    onChange={event =>
                      setEditPersonForm(prev => ({
                        ...prev,
                        familyId: event.target.value,
                        relation: event.target.value ? (prev.relation === 'independent' ? 'other' : prev.relation) : 'independent',
                        customRelationTag: event.target.value ? prev.customRelationTag : ''
                      }))
                    }
                  >
                    <option value="">فرد تکی</option>
                    {families.map(family => (
                      <option key={family.id} value={family.id}>
                        {family.name}
                      </option>
                    ))}
                  </select>
                  {editPersonForm.familyId && (
                    <select
                      className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
                      value={editPersonForm.relation}
                      onChange={event => setEditPersonForm(prev => ({ ...prev, relation: event.target.value as PersonRelation, customRelationTag: '' }))}
                    >
                      {familyRelationOptions.map(relation => (
                        <option key={relation} value={relation}>
                          {relationLabels[relation]}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {editPersonForm.familyId && editPersonForm.relation === 'other' && (
                  <input
                    className="w-full rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-50 placeholder:text-amber-100/50 focus:border-amber-300 focus:outline-none"
                    placeholder="تگ نسبت سایر"
                    value={editPersonForm.customRelationTag}
                    onChange={event => setEditPersonForm(prev => ({ ...prev, customRelationTag: event.target.value }))}
                  />
                )}
                <textarea
                  className="min-h-32 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-400/70 focus:outline-none"
                  value={editPersonForm.futurePlan}
                  onChange={event => setEditPersonForm(prev => ({ ...prev, futurePlan: event.target.value }))}
                  placeholder="برنامه آینده فرد"
                />
                {renderTimePanel(modalTargetPerson.createdAt, modalTargetPerson.updatedAt, modalTargetPerson.editHistory)}
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-black text-white" type="submit">
                  <Save className="h-4 w-4" />
                  ذخیره و ثبت تاریخ ویرایش
                </button>
              </form>
            ) : null}
          </div>
        </div>
        </div>,
          document.body
        )}
    </div>
  );
};
