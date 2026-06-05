'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { AdminLayout } from '@/components/admin-layout';
import { supabase, type Candidate } from '@/lib/supabase';
import {
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Upload,
} from 'lucide-react';

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
  const [previewUrl, setPreviewUrl] = useState<string>('');

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
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('candidates')
      .select('id,name,position,department,year,bio,photo_url,manifesto,vote_count,created_at')
      .order('position')
      .order('name');
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
      return;
    }

    setSelectedFile(file);
    // Create preview
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
      
      // Check if bucket exists and upload
      const { data, error } = await supabase.storage
        .from('candidate-photos')
        .upload(fileName, file, {
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

      // Get public URL
      const { data: publicData } = supabase.storage
        .from('candidate-photos')
        .getPublicUrl(fileName);

      return publicData?.publicUrl || '';
    } catch (err) {
      console.error('Upload error:', err);
      throw err;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null); // Clear previous messages

    if (!form.name || !form.position) {
      setMessage({ type: 'error', text: 'Name and position are required' });
      setSubmitting(false);
      return;
    }

    try {
      let photoUrl = form.photo_url;
      let uploadWarning = '';

      // Upload image if a new file was selected
      if (selectedFile) {
        try {
          photoUrl = await uploadImage(selectedFile);
        } catch (uploadErr) {
          // Show warning but allow continuing without image
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
        // Update
        const { data, error } = await supabase
          .from('candidates')
          .update(dataToSubmit)
          .eq('id', editingId)
          .select('id,name,position,department,year,bio,photo_url,manifesto,vote_count,created_at')
          .single();
        
        if (error) {
          console.error('Update error:', error);
          throw new Error(`Failed to update: ${error.message}`);
        }
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
        // Insert
        const { data, error } = await supabase
          .from('candidates')
          .insert([dataToSubmit])
          .select('id,name,position,department,year,bio,photo_url,manifesto,vote_count,created_at')
          .single();
        
        if (error) {
          console.error('Insert error:', error);
          throw new Error(`Failed to add candidate: ${error.message}`);
        }
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
      const errorMessage = err instanceof Error ? err.message : 'An error occurred. Please check the browser console.';
      console.error('Full error:', err);
      setMessage({
        type: 'error',
        text: errorMessage,
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

  const positions = useMemo(() => Array.from(new Set(candidates.map((c) => c.position))), [candidates]);

  return (
    <AdminLayout activePage="candidates">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Manage Candidates</h1>
            <p className="text-slate-500 mt-1">Add, edit, or remove candidates</p>
          </div>
          <button
            onClick={() => handleOpen()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Candidate
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl border ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{message.text}</p>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-[3px] border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Loading candidates...</p>
            </div>
          </div>
        ) : candidates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg font-medium mb-4">No candidates yet</p>
            <button
              onClick={() => handleOpen()}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Candidate
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {positions.map((position) => {
              const positionCandidates = candidates.filter(
                (c) => c.position === position
              );
              return (
                <div key={position}>
                  <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <div className="w-1 h-6 bg-blue-600 rounded-full" />
                    {position}
                  </h2>
                  <div className="space-y-3">
                    {positionCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{candidate.name}</p>
                          <p className="text-sm text-slate-500">
                            {candidate.department && `${candidate.department} `}
                            {candidate.year && `| Year ${candidate.year}`}
                          </p>
                          {candidate.bio && (
                            <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                              {candidate.bio}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs font-medium text-white bg-green-600 px-2 py-1 rounded-full">
                              {candidate.vote_count} votes
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleOpen(candidate)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(candidate.id)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? 'Edit Candidate' : 'Add New Candidate'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Position *
                  </label>
                  <input
                    type="text"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., President, Vice President"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., PCMC"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Year
                  </label>
                  <input
                    type="text"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 2nd Year"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Candidate Photo
                </label>
                <div className="space-y-3">
                  {/* File Input */}
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
                      className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      <div className="text-center">
                        <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                        <p className="text-sm font-medium text-slate-700">
                          {selectedFile ? selectedFile.name : 'Click to upload image'}
                        </p>
                        <p className="text-xs text-slate-500">PNG, JPG, GIF up to 5MB</p>
                      </div>
                    </label>
                  </div>

                  {/* Preview */}
                  {previewUrl && (
                    <div className="relative w-full h-40 bg-slate-100 rounded-lg overflow-hidden">
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewUrl('');
                          setSelectedFile(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Brief biography of the candidate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Manifesto
                </label>
                <textarea
                  value={form.manifesto}
                  onChange={(e) => setForm({ ...form, manifesto: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                  placeholder="Campaign manifesto and platform"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                  disabled={submitting || uploadingImage}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting || uploadingImage ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
