import {useCallback,useState,type SetStateAction} from 'react';

export type History<T>={past:T[];present:T;future:T[]};
/** 保存一次编辑并限制历史记录数量。 */
export function recordHistory<T>(history:History<T>,next:T,limit=50):History<T> {if(Object.is(history.present,next))return history;return{past:[...history.past,history.present].slice(-limit),present:next,future:[]};}
/** 将历史记录后退一步。 */
export function undoHistory<T>(history:History<T>):History<T> {if(!history.past.length)return history;return{past:history.past.slice(0,-1),present:history.past[history.past.length-1],future:[history.present,...history.future]};}
/** 恢复上一次撤销的编辑。 */
export function redoHistory<T>(history:History<T>):History<T> {if(!history.future.length)return history;return{past:[...history.past,history.present],present:history.future[0],future:history.future.slice(1)};}
/** 管理编辑状态与撤销、重做历史。 */
export function useHistory<T>(initial:()=>T) {
  const [history,setHistory]=useState<History<T>>(()=>({past:[],present:initial(),future:[]}));
  const setValue=useCallback((action:SetStateAction<T>)=>setHistory(h=>{const next=typeof action==='function'?(action as (previous:T)=>T)(h.present):action;return recordHistory(h,next)}),[]);
  const undo=useCallback(()=>setHistory(undoHistory),[]);const redo=useCallback(()=>setHistory(redoHistory),[]);
  return {value:history.present,setValue,undo,redo,canUndo:history.past.length>0,canRedo:history.future.length>0};
}
