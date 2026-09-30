'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface TreeLesson {
  id: number;
  title: string;
}

interface TreeCategory {
  id: number;
  title: string;
  lessons: TreeLesson[];
}

interface TreeSubject {
  id: number;
  title: string;
  icon: string | null;
  categories: TreeCategory[];
}

interface TreeSection {
  id: number;
  title: string;
  subjects: TreeSubject[];
}

export default function AdminSidebar() {
  const router = useRouter();
  const [tree, setTree] = useState<TreeSection[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const loadTree = async () => {
      const res = await fetch('/api/admin/tree');
      if (res.ok) {
        const data = await res.json() as { tree: TreeSection[] };
        setTree(data.tree);
        const initialExpanded: Record<string, boolean> = {};
        data.tree.forEach((s) => { initialExpanded[`sec-${s.id}`] = true; });
        setExpanded(initialExpanded);
      }
    };
    loadTree();
  }, []);

  const toggle = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="admin-sidebar">
      <div className="admin-sidebar-header">
        <span style={{ fontSize: '1.5rem' }}>✨</span> Lizora Admin
      </div>
      <div className="admin-sidebar-content">
        {tree.map(sec => (
          <div key={sec.id} className="tree-item">
            <div className="tree-item-label" onClick={() => toggle(`sec-${sec.id}`)}>
              {expanded[`sec-${sec.id}`] ? '📂' : '📁'} {sec.title}
            </div>
            {expanded[`sec-${sec.id}`] && (
              <div className="tree-children">
                {sec.subjects.map((sub) => (
                  <div key={sub.id} className="tree-item">
                    <div className="tree-item-label" onClick={() => toggle(`sub-${sub.id}`)}>
                      {sub.icon || '📚'} {sub.title}
                    </div>
                    {expanded[`sub-${sub.id}`] && (
                      <div className="tree-children">
                        {sub.categories.map((cat) => (
                          <div key={cat.id} className="tree-item">
                            <div className="tree-item-label" onClick={() => toggle(`cat-${cat.id}`)}>
                              🏷️ {cat.title}
                              <Link href={`/admin/lesson/new?categoryId=${cat.id}`} className="ml-auto text-primary" style={{ fontSize: '0.8rem', marginLeft: 'auto' }}>
                                + Урок
                              </Link>
                            </div>
                            {expanded[`cat-${cat.id}`] && (
                              <div className="tree-children">
                                {cat.lessons.map((les) => (
                                  <Link
                                    key={les.id}
                                    href={`/admin/lesson/${les.id}`}
                                    className="tree-item-label"
                                    style={{ fontSize: '0.9rem' }}
                                  >
                                    📄 {les.title}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: '1rem', borderTop: '1px solid var(--color-gray-200)' }}>
        <button
          className="btn-primary"
          style={{ width: '100%', padding: '0.5rem' }}
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/');
          }}
        >
          Выйти
        </button>
      </div>
    </div>
  );
}
