import { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MdInsertDriveFile } from 'react-icons/md'
import TextTimestamp from '../../components/TextTimestamp'
import EmptyState from '../../components/EmptyState'
import BulletinLink from '../../components/Bulletin/BulletinLink'
import { getDB } from '../../db/core'
import { dbAPI } from '../../db'
import { selectFileManagementData } from '../../selectors'
import {
	LoadFileManagementList,
	DeleteFileItem,
	BulkDeleteFiles,
} from '../../store/sagas/messenger.actions'

function formatSize(bytes) {
	if (!bytes || bytes === 0) return '0 B'
	const units = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(1024))
	return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}

function buildFileName(name, ext) {
	const base = (name || '').replace(/\.$/, '') // strip trailing dot
	if (!ext) return base
	// Ext may already start with a dot (e.g. ".jpg" from path.extname)
	const dotExt = ext.startsWith('.') ? ext : `.${ext}`
	const lowerBase = base.toLowerCase()
	const lowerDotExt = dotExt.toLowerCase()
	// Avoid double extension: "image.jpg" + ".jpg" → "image.jpg", not "image.jpg.jpg"
	if (lowerBase.endsWith(lowerDotExt)) return base
	return `${base}${dotExt}`
}

export default function FileManagerPanel() {
	const dispatch = useDispatch()
	const { list, page, totalPage } = useSelector(selectFileManagementData)
	const [currentFileType, setCurrentFileType] = useState('')
	const [selectedFileHashes, setSelectedFileHashes] = useState([])
	const [fileTypeOptions, setFileTypeOptions] = useState([])
	// File reference modal
	const [refModal, setRefModal] = useState({ open: false, fileHash: '', fileName: '', bulletins: [] })

	// Load all unique file extensions on mount
	useEffect(() => {
		getDB().then(async (db) => {
			const rows = await db.select(`SELECT DISTINCT LOWER(bf.file_ext) AS file_ext FROM bulletin_files bf WHERE bf.file_ext IS NOT NULL AND bf.file_ext != '' ORDER BY file_ext`)
			setFileTypeOptions(rows.map(r => r.file_ext.toLowerCase()))
		}).catch(() => {})
	}, [])

	useEffect(() => {
		dispatch(LoadFileManagementList({ category: 'bulletin', fileExt: currentFileType, page: 1 }))
	}, [currentFileType])

	const handlePageChange = useCallback((newPage) => {
		if (newPage < 1 || newPage > totalPage) return
		dispatch(LoadFileManagementList({ category: 'bulletin', fileExt: currentFileType, page: newPage }))
	}, [dispatch, currentFileType, totalPage])

	const handleDeleteFile = useCallback((hash) => {
		dispatch(DeleteFileItem({ hash }))
	}, [dispatch])

	const toggleFileSelect = useCallback((hash) => {
		setSelectedFileHashes(prev =>
			prev.includes(hash) ? prev.filter(h => h !== hash) : [...prev, hash]
		)
	}, [])

	const toggleFileSelectAll = useCallback(() => {
		setSelectedFileHashes(prev =>
			prev.length === list.length ? [] : list.map(item => item.hash)
		)
	}, [list])

	const handleBulkDeleteFiles = useCallback(() => {
		if (selectedFileHashes.length === 0) return
		dispatch(BulkDeleteFiles({ hashes: selectedFileHashes }))
		setSelectedFileHashes([])
	}, [dispatch, selectedFileHashes])

	// Show which bulletins reference this file
	const handleShowFileRefs = useCallback(async (fileHash, fileName) => {
		try {
			const refs = await dbAPI.getBulletinsByFileHash(fileHash)
			setRefModal({ open: true, fileHash, fileName, bulletins: refs })
		} catch (e) {
			console.error('Failed to load bulletin references:', e)
		}
	}, [])

	const handleCloseRefModal = useCallback(() => {
		setRefModal(prev => ({ ...prev, open: false }))
	}, [])

	return (
		<>
			<div className="flex flex-row items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					{fileTypeOptions.length > 0 && (
						<select
							value={currentFileType}
							onChange={(e) => {
								setCurrentFileType(e.target.value)
								setSelectedFileHashes([])
							}}
							className="px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-900 border-primary/20 dark:border-primary/30 text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
						>
							<option value="">All Types</option>
							{fileTypeOptions.map(ext => (
								<option key={ext} value={ext}>{ext}</option>
							))}
						</select>
					)}
				</div>

				<div className="flex items-center gap-2">
					{selectedFileHashes.length > 0 && (
						<button
							onClick={() => handleBulkDeleteFiles()}
							className="btn-sm btn-danger"
						>
							Delete Selected ({selectedFileHashes.length})
						</button>
					)}
				</div>
			</div>

			{list.length > 0 ? (
				<>
					<div className={`table-container overflow-x-auto`}>
						<table className="min-w-full divide-y divide-primary/10 dark:divide-primary/20">
							<thead>
								<tr className="table-header-row">
									<th style={{width: 48}}>
										<input
											type="checkbox"
											checked={selectedFileHashes.length === list.length && list.length > 0}
											onChange={toggleFileSelectAll}
											className="rounded"
										/>
									</th>
									<th style={{ width: 40 }}>#</th>
									<th className="text-center">Name</th>
									<th style={{width: 70}}>Size</th>
									<th style={{width: 80}}>Status</th>
									<th style={{width: 128}}>Timestamp</th>
									<th style={{width: 82}}></th>
								</tr>
							</thead>
							<tbody className="divide-y divide-primary/10 dark:divide-primary/20">
								{list.map((item, i) => (
									<tr key={item.hash} title={item.hash} className={`table-tr ${selectedFileHashes.includes(item.hash) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
										<td className="table-cell">
											<input
												type="checkbox"
												checked={selectedFileHashes.includes(item.hash)}
												onChange={() => toggleFileSelect(item.hash)}
												className="rounded"
											/>
										</td>
										<td className="table-cell">
											<span className="text-xs text-text-secondary dark:text-dark-text-secondary">
												{(page - 1) * 20 + i + 1}
											</span>
										</td>
										<td className="table-cell text-center">
											<span
												className="text-sm whitespace-nowrap cursor-pointer text-primary dark:text-dark-primary hover:underline"
												onClick={() => handleShowFileRefs(item.hash, buildFileName(item.file_name, item.file_ext))}
											>
												{buildFileName(item.file_name, item.file_ext)}
											</span>
										</td>
										<td className="table-cell">
											<span className="text-sm">{formatSize(item.size)}</span>
										</td>
										<td className="table-cell">
											{item.is_saved ? (
												<span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
													Saved
												</span>
											) : (
												<span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
													Pending
												</span>
											)}
										</td>
										<td className="table-cell">
											<TextTimestamp timestamp={item.updated_at} />
										</td>
										<td className="table-cell">
											<button
												className="btn-sm btn-danger"
												onClick={() => handleDeleteFile(item.hash)}
											>
												Delete
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="flex items-center justify-center gap-4 mt-4 text-sm text-text-secondary dark:text-dark-text-secondary">
						<button
							onClick={() => handlePageChange(page - 1)}
							disabled={page <= 1}
							className="px-3 py-1.5 rounded-lg border border-primary/20 dark:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
						>
							Prev
						</button>
						<span>Page {page} / {totalPage}</span>
						<button
							onClick={() => handlePageChange(page + 1)}
							disabled={page >= totalPage}
							className="px-3 py-1.5 rounded-lg border border-primary/20 dark:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
						>
							Next
						</button>
					</div>
				</>
			) : (
				<EmptyState
					icon={<MdInsertDriveFile className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
					title="No bulletin files found"
					description="Bulletin files will appear here"
					className="mx-auto max-w-sm mt-8"
				/>
			)}

			{/* File References Modal */}
			{refModal.open && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleCloseRefModal}>
					<div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto border border-primary/20 dark:border-primary/30" onClick={e => e.stopPropagation()}>
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
								Bulletins using this file
							</h3>
							<button onClick={handleCloseRefModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">&times;</button>
						</div>
						<p className="text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-3">
							{refModal.fileName}
						</p>
						{refModal.bulletins.length > 0 ? (
							<div className="space-y-2">
								{refModal.bulletins.map(b => {
									const bFileName = buildFileName(b.file_name, b.file_ext)
									return (
										<div key={b.hash} className="flex flex-col gap-1.5 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
											<div className="flex items-center gap-2">
												<BulletinLink address={b.address} sequence={b.sequence} hash={b.hash} />
												<span className="text-xs font-mono text-text-secondary dark:text-dark-text-secondary" title={bFileName}>
													{bFileName}
												</span>
											</div>
											<p className="text-xs text-text-secondary dark:text-dark-text-secondary line-clamp-2 break-words" title={b.content_preview}>
												{b.content_preview}
											</p>
										</div>
									)
								})}
							</div>
						) : (
							<p className="text-sm text-gray-400">No bulletin references found</p>
						)}
					</div>
				</div>
			)}
		</>
	)
}
