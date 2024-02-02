import { ArrowLeft, ArrowRight, ClipboardList, Copy, ListRestart, Microscope, Save, Undo2 } from 'lucide-react';
import * as React from 'react';
import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { ChessStudyMove } from 'src/lib/storage';

const chunkArray = <T,>(array: T[], chunkSize: number, offsetByOne: boolean = false) => {
	return array.reduce((resultArray, item, index) => {
		const chunkIndex = Math.floor((index + ((offsetByOne) ? 1 : 0)) / chunkSize);

		if (!resultArray[chunkIndex]) {
			resultArray[chunkIndex] = [];
		}

		resultArray[chunkIndex].push(item);

		return resultArray;
	}, [] as T[][]);
};

const MoveItem = ({
	isCurrentMove,
	san,
	onMoveItemClick,
}: {
	isCurrentMove: boolean;
	san: string;
	onMoveItemClick: () => void;
}) => {
	const ref = useRef<HTMLParagraphElement>(null);

	useEffect(() => {
		if (ref.current && isCurrentMove) {
			ref.current?.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
				inline: 'end',
			});
		}
	}, [isCurrentMove]);

	return (
		<p
			className={`move-item ${
				(isCurrentMove && 'active') || ''
			} vertical-align`}
			ref={ref}
			onClick={(e) => {
				e.stopPropagation();
				onMoveItemClick();
			}}
		>
			{san}
		</p>
	);
};

const VariantMoveItem = ({
	isCurrentMove,
	san,
	onMoveItemClick,
	moveIndicator = null,
}: {
	isCurrentMove: boolean;
	san: string;
	onMoveItemClick: () => void;
	moveIndicator?: string | null;
}) => {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (ref.current && isCurrentMove) {
			ref.current?.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
				inline: 'end',
			});
		}
	}, [isCurrentMove]);

	return (
		<div
			className={`variant-move-item ${(isCurrentMove && 'active') || ''}`}
			onClick={(e) => {
				e.stopPropagation();
				onMoveItemClick();
			}}
			ref={ref}
		>
			<span className={'variant-move-indicator'}>{moveIndicator}</span>
			{san}
		</div>
	);
};

const VariantMoveItemContainer = ({ children }: { children: ReactNode }) => {
	return <div className="variant-move-item-container">{children}</div>;
};

const VariantContainer = ({ children }: { children: ReactNode }) => {
	return <div className="variant-container">{children}</div>;
};

const VariantsContainer = ({ children }: { children: ReactNode }) => {
	return <div className="variants-container">{children}</div>;
};

export const PgnViewer = React.memo(
	({
		history,
		currentMoveId,
		firstPlayer,
		initialMoveNumber,
		onUndoButtonClick,
		onBackButtonClick,
		onForwardButtonClick,
		onMoveItemClick,
		onResetButtonClick,
		onSaveButtonClick,
		onPgnCopyButtonClick,
		onFenCopyButtonClick,
	}: {
		history: ChessStudyMove[];
		currentMoveId: string;
		firstPlayer: string;
		initialMoveNumber: number;
		onUndoButtonClick: () => void;
		onBackButtonClick: () => void;
		onForwardButtonClick: () => void;
		onMoveItemClick: (moveId: string) => void;
		onResetButtonClick: () => void;
		onSaveButtonClick: () => void;
		onPgnCopyButtonClick: () => void;
		onFenCopyButtonClick: () => void;
	}) => {
		const movePairs = useMemo(() => chunkArray(history, 2, firstPlayer === 'b'), [history]);

		return (
			<div className="height-width-100">
				<div className="move-item-section">
					<div className="move-item-container">
						{movePairs.map((pair, currentMoveIndex) => {
							const [wMove, bMove] = pair;

							return (
								<React.Fragment key={wMove.san + bMove?.san + currentMoveIndex}>
									<p className="move-indicator center">
										{currentMoveIndex + initialMoveNumber}
									</p>
									{(firstPlayer === 'b' && bMove === undefined && currentMoveIndex === 0) && (
										<MoveItem
											san={'...'}
											isCurrentMove={false}
											onMoveItemClick={() => {}}
										/>
									)}
									<MoveItem
										san={wMove.san}
										isCurrentMove={wMove.moveId === currentMoveId}
										onMoveItemClick={() => onMoveItemClick(wMove.moveId)}
									/>
									{bMove && (
										<MoveItem
											san={bMove.san}
											isCurrentMove={bMove.moveId === currentMoveId}
											onMoveItemClick={() => onMoveItemClick(bMove.moveId)}
										/>
									)}
									{!!wMove.variants.concat(bMove?.variants || []).length && (
										<VariantsContainer>
											{!!wMove.variants.length && (
												<VariantContainer>
													{wMove.variants.map((variant) => {
														return (
															<VariantMoveItemContainer key={variant.variantId}>
																{chunkArray(variant.moves, 2).map(
																	(pair, wMoveVarianti) => {
																		const [bMove, wMove] = pair;

																		return (
																			<React.Fragment
																				key={
																					bMove.san +
																					wMove?.san +
																					currentMoveIndex
																				}
																			>
																				<VariantMoveItem
																					isCurrentMove={
																						bMove.moveId === currentMoveId
																					}
																					san={bMove.san}
																					onMoveItemClick={() =>
																						onMoveItemClick(bMove.moveId)
																					}
																					moveIndicator={
																						(wMoveVarianti === 0 &&
																						 (firstPlayer === 'w'
																								|| currentMoveIndex > 0) &&
																							`${
																								currentMoveIndex +
																								initialMoveNumber +
																								wMoveVarianti
																							}... `) ||
																						(firstPlayer === 'b' &&
																						 currentMoveIndex === 0 &&
																							`${
																								currentMoveIndex +
																								initialMoveNumber +
																								wMoveVarianti
																							}. `) ||
																						null
																					}
																				/>
																				{wMove && (
																					<VariantMoveItem
																						isCurrentMove={
																							wMove.moveId === currentMoveId
																						}
																						san={wMove.san}
																						onMoveItemClick={() =>
																							onMoveItemClick(wMove.moveId)
																						}
																						moveIndicator={
																							((firstPlayer === 'w' ||
																							  currentMoveIndex > 0) &&
																								`${
																									currentMoveIndex +
																									initialMoveNumber + 1 +
																									wMoveVarianti
																								}. `) ||
																							null
																						}
																					/>
																				)}
																			</React.Fragment>
																		);
																	}
																)}
															</VariantMoveItemContainer>
														);
													})}
												</VariantContainer>
											)}
											{!!bMove?.variants.length && (
												<VariantContainer>
													{bMove.variants.map((variant) => {
														return (
															<VariantMoveItemContainer key={variant.variantId}>
																{chunkArray(variant.moves, 2).map(
																	(pair, bMoveVarianti) => {
																		const [wMove, bMove] = pair;
																		return (
																			<React.Fragment
																				key={
																					wMove.san +
																					bMove?.san +
																					currentMoveIndex
																				}
																			>
																				<VariantMoveItem
																					isCurrentMove={
																						wMove.moveId === currentMoveId
																					}
																					san={wMove.san}
																					onMoveItemClick={() =>
																						onMoveItemClick(wMove.moveId)
																					}
																					moveIndicator={
																						`${
																							currentMoveIndex
																							+ initialMoveNumber + 1
																							+ bMoveVarianti
																						}. `
																					}
																				/>
																				{bMove && (
																					<VariantMoveItem
																						isCurrentMove={
																							bMove.moveId === currentMoveId
																						}
																						san={bMove.san}
																						onMoveItemClick={() =>
																							onMoveItemClick(bMove.moveId)
																						}
																					/>
																				)}
																			</React.Fragment>
																		);
																	}
																)}
															</VariantMoveItemContainer>
														);
													})}
												</VariantContainer>
											)}
										</VariantsContainer>
									)}
								</React.Fragment>
							);
						})}
					</div>
				</div>
				<div className="button-section">
					<button className="study-button" onClick={() => onResetButtonClick()}>
						<Microscope strokeWidth={'1px'} />
					</button>
					<button className="study-button" onClick={() => onResetButtonClick()}>
						<ListRestart strokeWidth={'1px'} />
					</button>
					<button className="study-button" onClick={() => onBackButtonClick()}>
						<ArrowLeft />
					</button>
					<button className="study-button" onClick={() => onForwardButtonClick()}>
						<ArrowRight />
					</button>
				</div>
				<div className="button-section">
					<button className="study-button" onClick={() => onUndoButtonClick()}>
						<Undo2 />
					</button>
					<button className="study-button" onClick={() => onSaveButtonClick()}>
						<Save strokeWidth={'1px'} />
					</button>
					<button className="study-button" onClick={() => onPgnCopyButtonClick()}>
						<ClipboardList strokeWidth={'1px'} />
					</button>
					<button className="study-button" onClick={() => onFenCopyButtonClick()}>
						<Copy strokeWidth={'1px'} />
					</button>
				</div>
			</div>
		);
	}
);

PgnViewer.displayName = 'PgnViewer';
