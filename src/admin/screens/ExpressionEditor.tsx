import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  User,
  Cat,
  Loader2,
  CheckCircle,
  XCircle,
  Image,
} from 'lucide-react';

interface ExpressionDefinition {
  id: string;
  characterType: 'child' | 'pet';
  poseKey: string;
  displayName: string;
  generationPrompt: string;
  sortOrder: number;
  isActive: boolean;
}

interface ExpressionEditorProps {
  type: 'characters' | 'pets';
}

export function ExpressionEditor({ type }: ExpressionEditorProps) {
  const navigate = useNavigate();
  const [expressions, setExpressions] = useState<ExpressionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For characters, show both tabs. For pets, only show pet expressions
  const characterType = type === 'pets' ? 'pet' : 'child';
  const [activeTab, setActiveTab] = useState<'child' | 'pet'>(characterType);

  // New expression form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newExpressionKey, setNewExpressionKey] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingExpression, setEditingExpression] = useState<ExpressionDefinition | null>(null);

  const fetchExpressions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/characters?entity=poses');
      if (!res.ok) throw new Error('Failed to fetch expressions');
      const data = await res.json();
      setExpressions(data.poses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expressions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpressions();
  }, [fetchExpressions]);

  const handleCreateExpression = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpressionKey || !newDisplayName || !newPrompt) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/characters?entity=poses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterType: activeTab,
          poseKey: newExpressionKey.toLowerCase().replace(/\s+/g, '-'),
          displayName: newDisplayName,
          generationPrompt: newPrompt,
          sortOrder: expressions.filter((p) => p.characterType === activeTab).length + 1,
          isActive: true,
        }),
      });

      if (!res.ok) throw new Error('Failed to create expression');

      await fetchExpressions();
      setShowNewForm(false);
      setNewExpressionKey('');
      setNewDisplayName('');
      setNewPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expression');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateExpression = async (expression: ExpressionDefinition) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/characters?entity=poses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: expression.id,
          displayName: expression.displayName,
          generationPrompt: expression.generationPrompt,
          isActive: expression.isActive,
        }),
      });

      if (!res.ok) throw new Error('Failed to update expression');

      await fetchExpressions();
      setEditingExpression(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expression');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpression = async (expressionId: string) => {
    if (!confirm('Are you sure you want to delete this expression?')) return;

    try {
      const res = await fetch(`/api/admin/characters?entity=poses&id=${expressionId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete expression');

      await fetchExpressions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expression');
    }
  };

  const filteredExpressions = expressions.filter((p) => p.characterType === activeTab);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const backPath = type === 'pets' ? '/admin/pets' : '/admin/worlds';
  const title = type === 'pets' ? 'Pet Expression Definitions' : 'Character Expression Definitions';
  const subtitle = type === 'pets'
    ? 'Manage pet expressions for the portrait overlay system'
    : 'Manage child character expressions for the portrait overlay system';

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(backPath)}
            className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="text-slate-400 text-sm">{subtitle}</p>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6"
          >
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-300 text-sm underline mt-1"
            >
              Dismiss
            </button>
          </motion.div>
        )}

        {/* Tabs - only show for characters section */}
        {type === 'characters' && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('child')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'child'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              Child Expressions ({expressions.filter((p) => p.characterType === 'child').length})
            </button>
            <button
              onClick={() => setActiveTab('pet')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'pet'
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Cat className="w-4 h-4" />
              Pet Expressions ({expressions.filter((p) => p.characterType === 'pet').length})
            </button>
          </div>
        )}

        {/* Expressions List */}
        <div className="space-y-3 mb-6">
          {filteredExpressions.map((expression) => (
            <motion.div
              key={expression.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-slate-800/50 border rounded-xl p-4 ${
                expression.isActive ? 'border-slate-700/50' : 'border-red-500/30 opacity-60'
              }`}
            >
              {editingExpression?.id === expression.id ? (
                // Edit form
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editingExpression.displayName}
                    onChange={(e) =>
                      setEditingExpression({ ...editingExpression, displayName: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="Display Name"
                  />
                  <textarea
                    value={editingExpression.generationPrompt}
                    onChange={(e) =>
                      setEditingExpression({ ...editingExpression, generationPrompt: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white resize-none"
                    rows={3}
                    placeholder="Generation Prompt"
                  />
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-slate-300">
                      <input
                        type="checkbox"
                        checked={editingExpression.isActive}
                        onChange={(e) =>
                          setEditingExpression({ ...editingExpression, isActive: e.target.checked })
                        }
                        className="rounded"
                      />
                      Active
                    </label>
                    <div className="flex-1" />
                    <button
                      onClick={() => setEditingExpression(null)}
                      className="px-3 py-1.5 text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdateExpression(editingExpression)}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                // Display
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-white">{expression.displayName}</h3>
                      <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-400">
                        {expression.poseKey}
                      </span>
                      {expression.isActive ? (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2">
                      {expression.generationPrompt}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingExpression(expression)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                      title="Edit"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteExpression(expression.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {filteredExpressions.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No {activeTab} expressions defined yet</p>
            </div>
          )}
        </div>

        {/* Add New Expression */}
        {showNewForm ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6"
          >
            <h3 className="text-lg font-medium text-white mb-4">
              Add New {activeTab === 'child' ? 'Child' : 'Pet'} Expression
            </h3>
            <form onSubmit={handleCreateExpression} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Expression Key</label>
                  <input
                    type="text"
                    value={newExpressionKey}
                    onChange={(e) => setNewExpressionKey(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="e.g., excited"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="e.g., Celebrating"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Generation Prompt
                </label>
                <textarea
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white resize-none"
                  rows={3}
                  placeholder="Describe the facial expression for AI generation..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewForm(false);
                    setNewExpressionKey('');
                    setNewDisplayName('');
                    setNewPrompt('');
                  }}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !newExpressionKey || !newDisplayName || !newPrompt}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-600 text-white rounded-lg"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create Expression
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <button
            onClick={() => setShowNewForm(true)}
            className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl text-slate-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New {activeTab === 'child' ? 'Child' : 'Pet'} Expression
          </button>
        )}
      </div>
    </div>
  );
}
