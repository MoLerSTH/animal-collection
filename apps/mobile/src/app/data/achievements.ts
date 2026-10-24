import { ANIMAL_TYPES } from '../../features/collections/types';
import type { UserCollectionItem } from '../../features/collections/types';
import type { BadgeName } from '../components/BadgeArtwork';

export interface BadgeMission {
  id: string;
  label: string;
  done: boolean;
  collectionId?: string;
}
export interface Achievement {
  name: BadgeName;
  description: string;
  note: string;
  value: number;
  total: number;
  unlocked: boolean;
  remaining: number;
  unit: 'ชนิด' | 'ภาพ' | 'ประเภท' | 'วัน';
  missions: BadgeMission[];
}

const canonical = (item: UserCollectionItem) => {
  const name = (item.identifiedSpecies || item.animalSpecies || item.name).trim().toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ');
  return ['hippo', 'pygmy hippopotamus', 'pygmy hippo'].includes(name) ? 'hippopotamus' : name;
};
const uniqueSpecies = (items: UserCollectionItem[]) => Array.from(new Map(items.map(item => [canonical(item), item])).values());
const uniquePhotos = (items: UserCollectionItem[]) => Array.from(new Map(items.filter(item => item.photoUrl).map(item => [
  // A resolved server URL and its relative form refer to the same photo.
  item.photoUrl.replace(/^https?:\/\/[^/]+(?=\/api\/v1\/storage\/photos\/)/, ''), item,
])).values());
const captureTime = (item: UserCollectionItem) => {
  const raw = item.capturedAt || item.caughtAt;
  if (!raw) return null;
  // Legacy backend timestamps were UTC without the Z suffix.
  const date = new Date(/(?:Z|[+-]\d\d:\d\d)$/i.test(raw) ? raw : `${raw}Z`);
  return Number.isFinite(date.getTime()) ? date : null;
};
const capturedAtNight = (item: UserCollectionItem) => {
  const date = captureTime(item);
  if (!date) return false;
  const hour = (date.getUTCHours() + 7) % 24;
  return hour >= 18 || hour < 6;
};
const captureDay = (item: UserCollectionItem) => {
  const date = captureTime(item);
  return date ? new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10) : '';
};
const animalLabel = (item: UserCollectionItem) => item.identifiedSpecies || item.animalSpecies || item.name;

/** Derived from the signed-in account's records; gifts never count as camera captures. */
export function achievements(collections: UserCollectionItem[]): Achievement[] {
  const collected = uniqueSpecies(collections);
  const captures = uniquePhotos(collections.filter(item => item.source === 'capture'));
  const animalGroups = Array.from(new Map(captures.filter(item => item.animalType && item.animalType !== 'Unknown' && ANIMAL_TYPES.includes(item.animalType))
    .map(item => [item.animalType, item])).values());
  const captureDays = Array.from(new Map(captures.filter(item => captureDay(item)).map(item => [captureDay(item), item])).values());
  const make = (name: BadgeName, description: string, note: string, items: UserCollectionItem[], total: number, unit: Achievement['unit'] = 'ชนิด', label = animalLabel): Achievement => {
    const value = Math.min(items.length, total);
    return { name, description, note, value, total, unit, unlocked: value >= total, remaining: Math.max(total - value, 0),
      missions: [
        ...items.slice(0, total).map(item => ({id: item.id, label: label(item), done: true, collectionId: item.id})),
        ...Array.from({length: Math.max(total - items.length, 0)}, (_, index) => ({id: `pending-${index}`, label: `${unit === 'ชนิด' ? 'สัตว์ชนิด' : unit}ที่ ${items.length + index + 1}`, done: false})),
      ],
    };
  };
  return [
    make('Explorer', 'สะสมสัตว์ต่างชนิดให้ครบ 5 ชนิด', 'นับของขวัญเริ่มต้นด้วย สัตว์ชื่อชนิดเดียวกันนับครั้งเดียว แม้ตั้งชื่อการ์ดต่างกัน', collected, 5),
    make('Zoo Lover', 'เพิ่มสัตว์ที่ถ่ายเอง 2 ชนิดลงในรายการโปรด', 'เปิดการ์ดแล้วกด Add Favorite ทำได้ทุกสถานที่ สัตว์ชนิดเดิมนับครั้งเดียว ไม่นับของขวัญ', uniqueSpecies(captures.filter(item => item.isFavorite)), 2),
    make('Rare Finder', 'ถ่ายสัตว์ให้ครบ 2 ประเภท เช่น Mammal และ Fish', 'ประเภทใดก็ได้ เช่น แมวกับปลา หรือนกกับแมลง ไม่ต้องเป็นสัตว์หายาก ไม่นับ Unknown และของขวัญ', animalGroups, 2, 'ประเภท', item => `${item.animalType} · ${animalLabel(item)}`),
    make('Photo Pro', 'ถ่ายภาพสัตว์ด้วยตัวเองให้ครบ 5 ภาพ', 'ถ่ายสัตว์ชนิดเดิมซ้ำได้ แต่การบันทึกรูปเดียวกันซ้ำไม่นับเพิ่ม และไม่นับของขวัญ', captures, 5, 'ภาพ'),
    make('Night Owl', 'ถ่ายภาพสัตว์ช่วงกลางคืน 1 ภาพ', 'นับเวลา 18:00–05:59 ตามเวลาประเทศไทย ข้อมูลใหม่ใช้เวลาถ่าย ข้อมูลเก่าอิงเวลาบันทึก ไม่นับของขวัญ', captures.filter(capturedAtNight), 1, 'ภาพ'),
    make('Aquatic Friend', 'ถ่ายสัตว์น้ำต่างชนิดให้ครบ 2 ชนิด', 'นับประเภท Fish หรือแท็ก Aquatic ที่บันทึกไว้ ไม่นับของขวัญ', uniqueSpecies(captures.filter(item => item.animalType === 'Fish' || item.habitatTags?.includes('aquatic'))), 2),
    make('Mountain Climber', 'ถ่ายภาพสัตว์สะสมให้ครบ 3 วัน', 'ถ่ายที่ไหนก็ได้ ไม่ต้องขึ้นภูเขา สัตว์ชนิดเดิมถ่ายคนละวันได้ วันละหนึ่งครั้งตามเวลาประเทศไทย ข้อมูลเก่าอิงเวลาบันทึก ไม่นับของขวัญ', captureDays, 3, 'วัน', item => `${captureDay(item)} · ${animalLabel(item)}`),
    make('Bird Watcher', 'ถ่ายนกต่างชนิดให้ครบ 2 ชนิด', 'นับจากประเภท Bird ที่บันทึกไว้ ไม่นับของขวัญ', uniqueSpecies(captures.filter(item => item.animalType === 'Bird')), 2),
    make('Safari Master', 'ถ่ายสัตว์เลี้ยงลูกด้วยนมต่างชนิดให้ครบ 3 ชนิด', 'เช่น แมว สุนัข กระต่าย ถ่ายที่ไหนก็ได้ ไม่ต้องไปซาฟารี นับประเภท Mammal ที่บันทึกไว้ ไม่นับของขวัญ', uniqueSpecies(captures.filter(item => item.animalType === 'Mammal')), 3),
  ];
}
