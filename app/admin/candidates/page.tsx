'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { AdminLayout } from '@/components/admin-layout';
import { supabase, type Candidate } from '@/lib/supabase';
import { CANDIDATE_SELECT, fetchCandidates } from '@/lib/candidates';
import { Plus, Edit2, Trash2, AlertCircle, CheckCircle2, X, Upload } from 'lucide-react';

export default function CandidatesManagementPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    name: '',
    position: '',
    department: '',
    year: '',
    bio: '',
    photo_url: '',
    manifesto: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const sortedCandidates = useMemo(
    () => [...candidates].sort((a, b) => a.position.localeCompare(b.position) || a.name.localeCompare(b.name)),
    [candidates]
  );

  const resetForm = () => {
    setForm({
      name: '',
      position: '',
      department: '',
      year: '',
      bio: '',
      photo_url: '',
      manifesto: '',
    });
    setSelectedFile(null);
    setPreviewUrl('');
    setEditingId(null);
  };

  useEffect(() => {
    void loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    const { data, error } = await fetchCandidates();
    if (error) {
      setMessage({
        type: 'error',
        text: `Unable to load candidates: ${error.message}`,
      });
    } else {
      setCandidates(data ?? []);
    }
    setLoading(false);
  };

  const handleOpen = (candidate?: Candidate) => {
    if (candidate) {
      setForm({
        name: candidate.name,
        position: candidate.position,
        department: candidate.department,
        year: candidate.year,
        bio: candidate.bio,
        photo_url: candidate.photo_url,
        manifesto: candidate.manifesto,
      });
      setPreviewUrl(candidate.photo_url);
      setEditingId(candidate.id);
    } else {
      resetForm();
    }
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file: File): Promise<string> => {
    setUploadingImage(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeName = file.name
        .replace(/\.[^/.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 48);
      const fileName = `${Date.now()}-${crypto.randomUUID()}-${safeName || 'candidate'}.${extension}`;

      const { error } = await supabase.storage.from('candidate-photos').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        console.error('Storage upload error:', error);
        throw new Error(
          error.message.includes('Bucket not found')
            ? 'Photo bucket is missing. Apply the latest Supabase migration, then try uploading the photo again.'
            : `Image upload failed: ${error.message}`
        );
      }

      const { data: publicData } = supabase.storage.from('candidate-photos').getPublicUrl(fileName);
      return publicData?.publicUrl || '';
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    if (!form.name || !form.position) {
      setMessage({ type: 'error', text: 'Name and position are required' });
      setSubmitting(false);
      return;
    }

    try {
      let photoUrl = form.photo_url;
      let uploadWarning = '';

      if (selectedFile) {
        try {
          photoUrl = await uploadImage(selectedFile);
        } catch (uploadErr) {
          console.warn('Image upload skipped:', uploadErr);
          uploadWarning = uploadErr instanceof Error ? uploadErr.message : 'Image upload failed.';
          photoUrl = form.photo_url || '';
        }
      }

      const dataToSubmit = {
        name: form.name.trim(),
        position: form.position.trim(),
        department: form.department.trim(),
        year: form.year.trim(),
        bio: form.bio.trim(),
        photo_url: photoUrl.trim(),
        manifesto: form.manifesto.trim(),
      };

      if (editingId) {
        const { data, error } = await supabase
          .from('candidates')
          .update(dataToSubmit)
          .eq('id', editingId)
          .select(CANDIDATE_SELECT)
          .single();

        if (error) throw new Error(`Failed to update: ${error.message}`);

        setCandidates((current) =>
          current
            .map((candidate) => (candidate.id === editingId ? data : candidate))
            .sort((a, b) => a.position.localeCompare(b.position) || a.name.localeCompare(b.name))
        );
        setMessage({
          type: uploadWarning ? 'error' : 'success',
          text: uploadWarning || 'Candidate updated successfully',
        });
      } else {
        const { data, error } = await supabase
          .from('candidates')
          .insert([dataToSubmit])
          .select(CANDIDATE_SELECT)
          .single();

        if (error) throw new Error(`Failed to add candidate: ${error.message}`);

        setCandidates((current) =>
          [...current, data].sort((a, b) => a.position.localeCompare(b.position) || a.name.localeCompare(b.name))
        );
        setMessage({
          type: uploadWarning ? 'error' : 'success',
          text: uploadWarning || 'Candidate added successfully',
        });
      }

      setShowModal(false);
      resetForm();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'An error occurred. Please check the browser console.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this candidate?')) return;

    try {
      const { error } = await supabase.from('candidates').delete().eq('id', id);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Candidate deleted' });
      setCandidates((current) => current.filter((candidate) => candidate.id !== id));
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'An error occurred',
      });
    }
  };

  return (
    <AdminLayout activePage="candidates">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Manage Candidates</h1>
            <p className="mt-1 text-slate-500">Add, edit, or remove candidates from the live ballot</p>
          </div>
          <button
            onClick={() => handleOpen()}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-blue-700 hover:shadow-lg"
          >
            <Plus className="h-5 w-5" />
            Add Candidate
          </button>
        </div>

        {message && (
          <div
            className={`flex items-center gap-3 rounded-xl border p-4 ${
              message.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{message.text}</p>
            <button onClick={() => setMessage(null)} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-600" />
              <p className="text-sm text-slate-500">Loading candidates...</p>
            </div>
          </div>
        ) : sortedCandidates.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p className="mb-4 text-lg font-medium text-slate-500">No candidates yet</p>
            <button
              onClick={() => handleOpen()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Your First Candidate
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
              >
                <div>
                  <p className="font-semibold text-slate-900">{candidate.name}</p>
                  <p className="text-sm text-slate-500">
                    {candidate.position}
                    {(candidate.department || candidate.year) && ' · '}
                    {candidate.department && `${candidate.department} `}
                    {candidate.year && `| Year ${candidate.year}`}
                  </p>
                  {candidate.bio && <p className="mt-1 line-clamp-1 text-xs text-slate-600">{candidate.bio}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-green-600 px-2 py-1 text-xs font-medium text-white">
                      {candidate.vote_count} votes
                    </span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    onClick={() => handleOpen(candidate)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(candidate.id)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? 'Edit Candidate' : 'Add New Candidate'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-700">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Position *</label>
                  <input
                    type="text"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., President, Vice President"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Department</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., PCMC"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Year</label>
                  <input
                    type="text"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 2nd Year"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Candidate Photo</label>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="file"
                      id="photo-upload"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="flex w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 px-4 py-3 transition-colors hover:border-blue-400 hover:bg-blue-50"
                    >
                      <div className="text-center">
                        <Upload className="mx-auto mb-1 h-5 w-5 text-slate-400" />
                        <p className="text-sm font-medium text-slate-700">
                          {selectedFile ? selectedFile.name : 'Click to upload image'}
                        </p>
                        <p className="text-xs text-slate-500">PNG, JPG, GIF up to 5MB</p>
                      </div>
                    </label>
                  </div>

                  {previewUrl && (
                    <div className="relative h-40 w-full overflow-hidden rounded-lg bg-slate-100">
                      <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewUrl('');
                          setSelectedFile(null);
                        }}
                        className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="w-full resize-none rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Brief biography of the candidate"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Manifesto</label>
                <textarea
                  value={form.manifesto}
                  onChange={(e) => setForm({ ...form, manifesto: e.target.value })}
                  className="w-full resize-none rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Campaign manifesto and platform"
                />
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-300 px-6 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  disabled={submitting || uploadingImage}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting || uploadingImage ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {uploadingImage ? 'Uploading...' : 'Saving...'}
                    </span>
                  ) : (
                    'Save Candidate'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
