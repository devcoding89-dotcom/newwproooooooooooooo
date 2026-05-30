import { useState, useEffect, useCallback } from 'react';
import { FileText, Upload, CheckCircle, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Badge } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Material, Course } from '../../types';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const statusIcon = {
  pending: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  processing: <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />,
  processed: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  failed: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
};

export default function TeacherMaterialsPage() {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [title, setTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile?.id) return;
    const [matRes, courseRes] = await Promise.all([
      supabase.from('materials').select('*, courses(name, code)').eq('teacher_id', profile.id).order('uploaded_at', { ascending: false }),
      supabase.from('courses').select('*').eq('teacher_id', profile.id).order('code'),
    ]);
    setMaterials((matRes.data || []) as Material[]);
    setCourses(courseRes.data || []);
    setIsLoading(false);
  }, [profile?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpload = async (file: File) => {
    if (!selectedCourse || !file || !profile?.id) return;
    setUploading(true);
    try {
      const filePath = `${selectedCourse}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('materials').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('materials').insert({
        course_id: selectedCourse,
        teacher_id: profile.id,
        title: title || file.name,
        file_path: filePath,
        file_size: file.size,
        processing_status: 'pending',
      });
      if (dbError) throw dbError;

      setTitle('');
      fetchData();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout title="Course Materials" subtitle="Upload and manage PDF materials for AI processing">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Upload Panel */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Upload New Material</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Select Course</label>
              <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="input-field text-sm">
                <option value="">Choose course...</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Title (optional)</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Week 5 Notes" className="input-field text-sm" />
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file?.type === 'application/pdf') handleUpload(file);
              }}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${isDragging ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500 mb-2">Drag & drop PDF here or</p>
              <label className="cursor-pointer text-xs text-primary-600 font-medium hover:underline">
                Browse file
                <input type="file" accept=".pdf" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }} />
              </label>
            </div>

            {uploading && (
              <div className="flex items-center gap-2.5 p-3 bg-blue-50 rounded-xl">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <p className="text-xs text-blue-700">Uploading and queuing for AI processing...</p>
              </div>
            )}
          </div>
        </div>

        {/* Materials List */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Uploaded Materials</h2>
            <span className="text-xs text-gray-400">{materials.length} files</span>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />)}
            </div>
          ) : materials.length === 0 ? (
            <EmptyState title="No materials yet" description="Upload PDFs to enable the AI revision assistant for your students." icon={<FileText className="w-5 h-5 text-gray-400" />} />
          ) : (
            <div className="divide-y divide-gray-50">
              {materials.map((m) => (
                <div key={m.id} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50/50">
                  <div className="p-2 bg-red-50 rounded-lg flex-shrink-0">
                    <FileText className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.title}</p>
                    <p className="text-xs text-gray-500">{(m.courses as { code?: string; name?: string })?.code} · {formatBytes(m.file_size)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      {statusIcon[m.processing_status]}
                      <Badge variant={
                        m.processing_status === 'processed' ? 'green'
                        : m.processing_status === 'failed' ? 'red'
                        : m.processing_status === 'processing' ? 'blue' : 'amber'
                      }>
                        {m.processing_status}
                      </Badge>
                    </div>
                    <button className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
