import 'server-only';import { createSupabaseServerClient } from '@/lib/supabase/server'
export type ResourceFilters={category?:string}
export function parseResourceFilters(p:URLSearchParams):ResourceFilters{return{category:p.get('category')||undefined}}
// One row of public.resources.
export type ResourceRow={id:string;legacy_source_id:string|null;title:string;description:string;category:string;source_name:string;url:string;source_kind:'club'|'official'|'external';official_source:boolean;source_url:string;pinned:boolean;sort_order:number;publication_state:'draft'|'published'|'archived';published_at:string|null;created_at:string;updated_at:string}
// One row of public.partner_schools. `questions` is free-form JSON.
export type PartnerSchoolRow={id:string;legacy_source_id:string|null;name:string;short_name:string;location:string;official_url:string;questions:unknown;sort_order:number;publication_state:'draft'|'published'|'archived';published_at:string|null;created_at:string;updated_at:string}
export async function listPublishedResources(filters:ResourceFilters={}):Promise<ResourceRow[]>{if(!process.env.NEXT_PUBLIC_SUPABASE_URL)return[];const s=await createSupabaseServerClient();let q=s.from('resources').select('*').eq('publication_state','published').order('pinned',{ascending:false}).order('sort_order');if(filters.category)q=q.ilike('category',filters.category);const{data,error}=await q;if(error)throw new Error(`RESOURCES_LOAD_FAILED:${error.message}`);return data??[]}
export async function listPublishedPartnerSchools():Promise<PartnerSchoolRow[]>{if(!process.env.NEXT_PUBLIC_SUPABASE_URL)return[];const s=await createSupabaseServerClient();const{data}=await s.from('partner_schools').select('*').eq('publication_state','published').order('sort_order');return data??[]}
