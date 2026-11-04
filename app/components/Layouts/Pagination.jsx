import { cn } from '@/assets/utils'
import {
	faChevronLeft,
	faChevronRight,
	faAngleDoubleLeft,
	faAngleDoubleRight,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useState, useEffect } from 'react'

export const Pagination = ({
	data,
	itemsPerPage = 50,
	callBackChangePage,
	showPaginator = false,
	showItemCountSelector = false,
	size = 'md',
}) => {
	const [currentPage, setCurrentPage] = useState(1)
	const [itemsPerPageState, setItemsPerPageState] = useState(itemsPerPage)
	const [totalPages, setTotalPages] = useState(Math.ceil(data.length / itemsPerPageState))
	const pageRange = 5

	useEffect(() => {
		setTotalPages(Math.ceil(data.length / itemsPerPageState))
		setCurrentPage(1)
		callBackChangePage?.(data.length > 0 ? data.slice(0, itemsPerPageState) : [])
	}, [data, itemsPerPageState, callBackChangePage])

	const handleClick = page => {
		setCurrentPage(page)
		const startIndex = (page - 1) * itemsPerPageState
		const endIndex = startIndex + itemsPerPageState
		callBackChangePage?.(data.slice(startIndex, endIndex))
	}

	const getSizeClasses = () => {
		switch (size) {
			case 'sm':
				return 'h-6 px-2 text-xs'
			case 'lg':
				return 'h-12 px-4 text-lg'
			default:
				return 'h-9 px-3 text-sm'
		}
	}

	const getIconSize = () => {
		switch (size) {
			case 'sm':
				return 8
			case 'lg':
				return 16
			default:
				return 12
		}
	}

	const getPageNumbers = () => {
		const startPage = Math.max(1, currentPage - Math.floor(pageRange / 2))
		const endPage = Math.min(totalPages, startPage + pageRange - 1)
		return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)
	}

	return (
		<>
			{(showPaginator || showItemCountSelector) && (
				<div className='flex justify-between items-center mb-4'>
					{showPaginator && (
						<span className='text-sm text-gray-700 dark:text-gray-400'>
							Mostrando {itemsPerPageState * (currentPage - 1) + 1} a{' '}
							{Math.min(itemsPerPageState * currentPage, data.length)} de {data.length} itens
						</span>
					)}
					{showItemCountSelector && (
						<>
							<label
								htmlFor='itemsPerPage'
								className='text-sm text-gray-700 dark:text-gray-400 mr-2'
							>
								Itens por página:
							</label>
							<select
								id='itemsPerPage'
								value={itemsPerPageState}
								onChange={event => setItemsPerPageState(Number(event.target.value))}
								className='border border-gray-300 rounded-md p-1 text-sm'
							>
								{[10, 20, 50, 100].map(size => (
									<option key={size} value={size}>
										{size}
									</option>
								))}
							</select>
						</>
					)}
				</div>
			)}
			{totalPages > 1 && (
				<nav aria-label='Page navigation example'>
					<ul className='inline-flex -space-x-px'>
						{currentPage > 1 && (
							<>
								<li>
									<a
										href='#'
										onClick={() => handleClick(1)}
										className={`flex items-center justify-center border border-gray-300 rounded-s-lg bg-white hover:bg-gray-100 ${getSizeClasses()}`}
									>
										<FontAwesomeIcon
											icon={faAngleDoubleLeft}
											width={getIconSize()}
											height={getIconSize()}
										/>
									</a>
								</li>
								<li>
									<a
										href='#'
										onClick={() => handleClick(currentPage - 1)}
										className={`flex items-center justify-center border border-gray-300 bg-white hover:bg-gray-100 ${getSizeClasses()}`}
									>
										<FontAwesomeIcon
											icon={faChevronLeft}
											width={getIconSize()}
											height={getIconSize()}
										/>
									</a>
								</li>
							</>
						)}
						{getPageNumbers().map(page => (
							<li key={page}>
								<a
									href='#'
									onClick={() => handleClick(page)}
									className={cn(
										`flex items-center justify-center`,
										getSizeClasses(),
										currentPage === page
											? 'text-blue-600 border border-gray-300 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-700 dark:text-white'
											: 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
									)}
								>
									{page}
								</a>
							</li>
						))}
						{currentPage < totalPages && (
							<>
								<li>
									<a
										href='#'
										onClick={() => handleClick(currentPage + 1)}
										className={`flex items-center justify-center border border-gray-300 bg-white hover:bg-gray-100 ${getSizeClasses()}`}
									>
										<FontAwesomeIcon
											icon={faChevronRight}
											width={getIconSize()}
											height={getIconSize()}
										/>
									</a>
								</li>
								<li>
									<a
										href='#'
										onClick={() => handleClick(totalPages)}
										className={`flex items-center justify-center border border-gray-300 rounded-e-lg bg-white hover:bg-gray-100 ${getSizeClasses()}`}
									>
										<FontAwesomeIcon
											icon={faAngleDoubleRight}
											width={getIconSize()}
											height={getIconSize()}
										/>
									</a>
								</li>
							</>
						)}
					</ul>
				</nav>
			)}
		</>
	)
}
