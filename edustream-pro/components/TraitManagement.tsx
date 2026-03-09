import React, { useState, useEffect } from 'react';
import { AffectiveTrait, PsychomotorTrait } from '../types';
import { apiService as dataService } from '../services/apiService';

const TraitManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'affective' | 'psychomotor'>('affective');
  const [affectiveTraits, setAffectiveTraits] = useState<AffectiveTrait[]>([]);
  const [psychomotorTraits, setPsychomotorTraits] = useState<PsychomotorTrait[]>([]);
  const [newTraitName, setNewTraitName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
      setLoading(true);
      const [affective, psychomotor] = await Promise.all([
        dataService.getAffectiveTraits(),
        dataService.getPsychomotorTraits()
      ]);
      setAffectiveTraits(Array.isArray(affective) ? affective : []);
      setPsychomotorTraits(Array.isArray(psychomotor) ? psychomotor : []);
    } catch (error) {
      console.error('Failed to load traits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTraitName.trim()) return;

    try {
      setSaving(true);
      if (activeTab === 'affective') {
        await dataService.addAffectiveTrait(newTraitName.trim());
      } else {
        await dataService.addPsychomotorTrait(newTraitName.trim());
      }
      setNewTraitName('');
      await refreshData();
    } catch (error) {
      console.error('Failed to add trait:', error);
      alert('Failed to add trait');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this trait? Existing ratings for students may be lost.')) return;

    try {
      if (activeTab === 'affective') {
        await dataService.deleteAffectiveTrait(id);
      } else {
        await dataService.deletePsychomotorTrait(id);
      }
      await refreshData();
    } catch (error) {
      console.error('Failed to delete trait:', error);
      alert('Failed to delete trait');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Loading Traits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fadeIn max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tighter">Assessment Configuration</h1>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Behavioral & Physical Skill Definitions</p>
        </div>
        
        <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 flex">
          <button 
            onClick={() => setActiveTab('affective')}
            className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'affective' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Affective Traits
          </button>
          <button 
            onClick={() => setActiveTab('psychomotor')}
            className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'psychomotor' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Psychomotor Skills
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creation Card */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 h-fit">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${activeTab === 'affective' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          </div>
          <h2 className="text-xl font-black text-gray-800 mb-2">New {activeTab === 'affective' ? 'Trait' : 'Skill'}</h2>
          <p className="text-xs text-gray-400 font-medium mb-6 leading-relaxed">
            {activeTab === 'affective' 
              ? 'Define emotional behaviors like Honesty, Punctuality, or Teamwork.' 
              : 'Define physical skills like Handwriting, Sports, or Lab Handling.'}
          </p>

          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Internal Title</label>
              <input 
                required
                placeholder="e.g. Self Confidence"
                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-gray-700 transition-all"
                value={newTraitName}
                onChange={e => setNewTraitName(e.target.value)}
                disabled={saving}
              />
            </div>
            <button 
              type="submit"
              disabled={saving || !newTraitName.trim()}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === 'affective' 
                  ? 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700' 
                  : 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700'
              }`}
            >
              {saving ? 'Adding...' : 'Add to Curriculum'}
            </button>
          </form>
        </div>

        {/* List View */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
             <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Active Trackers</span>
                <span className="text-[10px] font-black text-indigo-500 uppercase">{activeTab === 'affective' ? affectiveTraits.length : psychomotorTraits.length} Items Defined</span>
             </div>
             <div className="divide-y divide-gray-50">
                {(activeTab === 'affective' ? affectiveTraits : psychomotorTraits).map((trait, idx) => (
                  <div key={trait.id} className="px-8 py-5 flex items-center justify-between group hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-5">
                       <span className="text-gray-300 font-black text-sm w-4 italic">{idx + 1}.</span>
                       <span className="font-bold text-gray-800">{trait.name}</span>
                    </div>
                    <button 
                      onClick={() => handleDelete(trait.id)}
                      className="p-2.5 text-red-400 hover:text-red-600 hover:bg-white hover:shadow-sm rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      title="Delete trait"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                ))}
                {(activeTab === 'affective' ? affectiveTraits : psychomotorTraits).length === 0 && (
                  <div className="px-8 py-20 text-center opacity-30 italic font-medium text-sm">
                    No {activeTab === 'affective' ? 'traits' : 'skills'} defined yet. Use the form to create some.
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TraitManagement;
