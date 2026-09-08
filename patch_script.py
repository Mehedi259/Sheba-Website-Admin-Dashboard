import sys

with open('src/components/ClassifiedsView.tsx', 'r') as f:
    content = f.read()

# Pagination state
content = content.replace(
    '  const [selectedImage, setSelectedImage] = useState<File | null>(null);',
    '''  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);'''
)

# fetchData
content = content.replace(
    '  const fetchData = async () => {',
    '  const fetchData = async (page = 1) => {'
)

content = content.replace(
    'const response = await api.get(`/admin/${type}/`);\n      setData(response.data.results || response.data);',
    '''const response = await api.get(`/admin/${type}/?page=${page}`);
      if (response.data && response.data.results) {
        setData(response.data.results);
        setTotalCount(response.data.count || 0);
        setTotalPages(Math.ceil((response.data.count || 0) / 10)); // Assuming default page size is 10
      } else {
        setData(response.data);
        setTotalPages(1);
      }'''
)

# useEffect
content = content.replace(
    'fetchData();',
    'fetchData(currentPage);'
)
content = content.replace(
    '  }, [type]);',
    '  }, [type, currentPage]);'
)

# handleDelete
content = content.replace(
    'setData(data.filter(item => item.id !== id));',
    'fetchData(currentPage);'
)

# handleSave
content = content.replace(
    'setData([response.data, ...data]);',
    'fetchData(currentPage);'
)

content = content.replace(
    '// Re-fetch to get updated images if needed, or just let it be\n          fetchData();',
    'fetchData(currentPage);'
)

# Adding user column head
content = content.replace(
    '<th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">বিস্তারিত</th>',
    '<th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">ব্যবহারকারী</th>\n                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">বিস্তারিত</th>'
)

# Adding user column body
content = content.replace(
    '<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">\n                        {type === \'jobs\' && (',
    '''<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.user_name || item.owner_name || 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {type === 'jobs' && ('''
)

# Adding pagination controls
content = content.replace(
    '              </table>\n            </div>\n          </div>\n        </div>\n      </div>',
    '''              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg shadow">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                      {totalCount > 0 && <span> ({totalCount} total items)</span>}
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                        <span className="sr-only">Previous</span>
                        &larr;
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                        <span className="sr-only">Next</span>
                        &rarr;
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>'''
)

with open('src/components/ClassifiedsView.tsx', 'w') as f:
    f.write(content)

