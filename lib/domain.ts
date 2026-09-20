export const bloodGroups = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] as const;
export type BloodGroup = (typeof bloodGroups)[number];
export type Availability = "AVAILABLE" | "PAUSED";
export type RequestStatus = "OPEN" | "MATCHED" | "CANCELLED" | "EXPIRED";
export type NotificationResponse = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "FAILED";
export interface Location { latitude: number; longitude: number; label?: string }
export interface Donor { id:string; ownerId?:string; userId?:string|null; name:string; bloodGroup:BloodGroup; location:Location; lastDonationDate:string|null; availability:Availability; notificationConsent:boolean; pausedUntil?:string|null; lastNotifiedAt?:string|null; telegramChatId?:string|null; telegramLinkTokenExpiresAt?:string|null; contact:string; activeMatchRequestId?:string|null }
export interface BloodRequest { id:string; requesterId:string; bloodGroup:BloodGroup; unitsRequired:number; hospital:string; location:Location; urgency:"ROUTINE"|"URGENT"|"EMERGENCY"; status:RequestStatus; createdAt:string; matchedDonorId?:string|null; contact:string }
// ponytail: one contact box accepting email or phone; shared by form, API, tests
export function isValidRequestContact(value: string): boolean { const v = value.trim(); if (v.length < 5 || v.length > 100) return false; if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return true; return (v.replace(/\D/g, "").length >= 7); }
export interface Notification { id:string; requestId:string; donorId:string; waveNumber:number; response:NotificationResponse; sentAt:string; respondedAt?:string|null; actionTokenHash?:string; actionToken?:string }
export interface CandidateExplanation { donorId:string; name:string; selected:boolean; reasons:string[]; distanceKm:number|null; priority:number|null }
export interface MatchResult { selected: CandidateExplanation[]; excluded: CandidateExplanation[] }
