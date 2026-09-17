import type { BloodGroup } from "./domain";
const recipients: Record<BloodGroup, readonly BloodGroup[]> = { "O-":["O-"],"O+":["O-","O+"],"A-":["O-","A-"],"A+":["O-","O+","A-","A+"],"B-":["O-","B-"],"B+":["O-","O+","B-","B+"],"AB-":["O-","A-","B-","AB-"],"AB+":["O-","O+","A-","A+","B-","B+","AB-","AB+"] };
export function isBloodCompatible(donor: BloodGroup, recipient: BloodGroup): boolean { return recipients[recipient].includes(donor); }
