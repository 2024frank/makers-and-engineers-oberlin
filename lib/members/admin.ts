import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
export type AdminMemberRow={userId:string;displayName:string;email:string;status:string;classYear:number|null;major:string|null;disciplines:string[];skills:string[];updatedAt:string}
// The member_profiles columns selected below.
type MemberProfileRow={user_id:string;display_name:string;oberlin_email:string;status:string;class_year:number|null;major:string|null;disciplines:string[];skills:string[];updated_at:string}
export async function listAdminMembers():Promise<AdminMemberRow[]>{const s=await createSupabaseServerClient();const{data,error}=await s.from('member_profiles').select('user_id,display_name,oberlin_email,status,class_year,major,disciplines,skills,updated_at').order('display_name');if(error)throw new Error(`ADMIN_MEMBERS_LOAD_FAILED:${error.message}`);return(data??[]).map((r:MemberProfileRow)=>({userId:r.user_id,displayName:r.display_name,email:r.oberlin_email,status:r.status,classYear:r.class_year,major:r.major,disciplines:r.disciplines??[],skills:r.skills??[],updatedAt:r.updated_at}))}
