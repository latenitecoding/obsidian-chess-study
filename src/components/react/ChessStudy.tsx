import { JSONContent } from '@tiptap/react';
import { Chess, Move } from 'chess.js';
import { Api } from 'chessground/api';
import { DrawShape } from 'chessground/draw';
import { nanoid } from 'nanoid';
import { App, Notice } from 'obsidian';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { ChessStudyPluginSettings } from 'src/components/obsidian/SettingsTab';
import { parseUserConfig } from 'src/lib/obsidian';
import {
	ChessStudyDataAdapter,
	ChessStudyFileData,
	ChessStudyMove,
	VariantMove,
} from 'src/lib/storage';
import {
	displayInitialBoard,
	displayMoveInHistory,
	findMoveIndex,
	getCurrentMove,
} from 'src/lib/ui-state';
import { useImmerReducer } from 'use-immer';
import { ChessgroundProps, ChessgroundWrapper } from './ChessgroundWrapper';
import { CommentSection } from './CommentSection';
import { PgnViewer } from './PgnViewer';

export type ChessStudyConfig = ChessgroundProps;

interface AppProps {
	source: string;
	app: App;
	pluginSettings: ChessStudyPluginSettings;
	chessStudyData: ChessStudyFileData;
	dataAdapter: ChessStudyDataAdapter;
}

export interface GameState {
	currentMove: ChessStudyMove | VariantMove;
	isViewOnly: boolean;
	study: ChessStudyFileData;
}

export type GameActions =
	| { type: 'ADD_MOVE_TO_HISTORY'; move: Move }
	| { type: 'REMOVE_LAST_MOVE_FROM_HISTORY' }
	| { type: 'DISPLAY_INITIAL_BOARD' }
	| { type: 'DISPLAY_NEXT_MOVE_IN_HISTORY' }
	| { type: 'DISPLAY_PREVIOUS_MOVE_IN_HISTORY' }
	| { type: 'DISPLAY_SELECTED_MOVE_IN_HISTORY'; moveId: string }
	| { type: 'SYNC_SHAPES'; shapes: DrawShape[] }
	| { type: 'SYNC_COMMENT'; comment: JSONContent | null }
	| { type: 'TAG_CURRENT_MOVE' };

export const ChessStudy = ({
	source,
	pluginSettings,
	chessStudyData,
	dataAdapter,
}: AppProps) => {
	// Parse Obsidian / Code Block Settings
	const { boardColor, boardOrientation, fen, viewComments, viewMoves, chessStudyId } =
		parseUserConfig(pluginSettings, source);

	// Setup Chessground API
	const [chessView, setChessView] = useState<Api | null>(null);

	// Setup Chess.js API
	const [firstPlayer, initialMoveNumber, initialChessLogic] = useMemo(() => {
		const chess = (fen) ? new Chess(fen) : new Chess();

		const firstPlayer = chess.turn();
		const initialMoveNumber = chess.moveNumber();

		if (chessStudyData.currentMove && chessStudyData.currentMove.moveId !== 'root') {
			for (let i = 0; i < chessStudyData.moves.length; i++) {
				const move = chessStudyData.moves[i];
				if (move.moveId === 'root') continue;
				chess.move({
					from: move.from,
					to: move.to,
					promotion: move.promotion,
				});
				if (move.moveId === chessStudyData.currentMove.moveId) break;
			};
		}

		return [firstPlayer, initialMoveNumber, chess];
	}, [chessStudyData]);

	const [chessLogic, setChessLogic] = useState(initialChessLogic);

	const [gameState, dispatch] = useImmerReducer<GameState, GameActions>(
		(draft, action) => {
			switch (action.type) {
				case 'DISPLAY_INITIAL_BOARD': {
					if (!chessView || !draft || draft.study.moves.length === 0) return draft;
					if (draft.study.moves.length === 1 && draft.study.moves[0].moveId === 'root') return draft;

					displayInitialBoard(draft, chessView, setChessLogic, {
						fen: fen,
					});

					return draft;
				}
				case 'DISPLAY_NEXT_MOVE_IN_HISTORY': {
					if (!chessView || !draft || draft.study.moves.length === 0) return draft;
					if (draft.study.moves.length === 1 && draft.study.moves[0].moveId === 'root') return draft;

					displayMoveInHistory(draft, chessView, setChessLogic, {
						offset: 1,
						selectedMoveId: null,
					});

					return draft;
				}
				case 'DISPLAY_PREVIOUS_MOVE_IN_HISTORY': {
					if (!chessView || !draft || draft.study.moves.length === 0) return draft;
					if (draft.currentMove === null || draft.currentMove.moveId === 'root') return draft;

					displayMoveInHistory(draft, chessView, setChessLogic, {
						offset: -1,
						selectedMoveId: null,
						fen: fen,
					});

					return draft;
				}
				case 'REMOVE_LAST_MOVE_FROM_HISTORY': {
					if (!chessView || !draft || draft.study.moves.length === 0) return draft;
					if (draft.study.moves.length === 1 && draft.study.moves[0].moveId === 'root') return draft;

					let moves = draft.study.moves;

					const currentMoveId = draft.currentMove?.moveId;

					const { variant, moveIndex } = findMoveIndex(moves, currentMoveId);

					if (variant) {
						const parent = moves[variant.parentMoveIndex];
						const variantMoves = parent.variants[variant.variantIndex].moves;

						const isLastMove = moveIndex === variantMoves.length - 1;

						if (isLastMove) {
							displayMoveInHistory(draft, chessView, setChessLogic, {
								offset: -1,
								selectedMoveId: currentMoveId,
							});
						}

						variantMoves.pop();
						if (variantMoves.length == 0) {
							parent.variants.splice(variant.variantIndex, 1);
						}

						if (isLastMove) {
							draft.currentMove = (variantMoves.length > 0) ? variantMoves[variantMoves.length - 1] : moves[variant.parentMoveIndex];
						}
					} else {
						const isLastMove = moveIndex === moves.length - 1;

						if (isLastMove) {
							displayMoveInHistory(draft, chessView, setChessLogic, {
								offset: -1,
								selectedMoveId: currentMoveId,
							});
						}

						moves.pop();

						if (isLastMove) {
							draft.currentMove = (moves.length > 0) ? moves[moves.length - 1] : null;
						}
					}

					return draft;
				}
				case 'DISPLAY_SELECTED_MOVE_IN_HISTORY': {
					if (!chessView || !draft || draft.study.moves.length == 0) return draft;
					if (draft.study.moves.length === 1 && draft.study.moves[0].moveId === 'root') return draft;

					const selectedMoveId = action.moveId;

					displayMoveInHistory(draft, chessView, setChessLogic, {
						offset: 0,
						selectedMoveId: selectedMoveId,
					});

					return draft;
				}
				case 'SYNC_SHAPES': {
					if (!chessView || !draft) return draft;

					const move = getCurrentMove(draft);

					move.shapes = action.shapes;
					draft.currentMove = move;

					return draft;
				}
				case 'SYNC_COMMENT': {
					if (!chessView || !draft) return draft;

					const move = getCurrentMove(draft);

					move.comment = action.comment;
					draft.currentMove = move;

					return draft;
				}
				case 'TAG_CURRENT_MOVE': {
					if (!chessView || !draft || draft.study.moves.length == 0) return draft;
					if (draft.currentMove?.moveId === 'root') return draft;

					const moves = draft.study.moves;
					const { variant, moveIndex } = findMoveIndex(moves, draft.currentMove?.moveId);
					//Are we in a variant? Are we not? Decide which move to display

					let moveToTag = null;
					if (variant) {
						const variantMoves =
							moves[variant.parentMoveIndex].variants[variant.variantIndex].moves;

						if (typeof variantMoves[moveIndex] !== 'undefined') {
							moveToTag = variantMoves[moveIndex];
						}
					} else {
						if (typeof moves[moveIndex] !== 'undefined') {
							moveToTag = moves[moveIndex];
						}
					}

					if (moveToTag === null) {
						return draft;
					}

					const lastTwo = moveToTag.san.slice(-2);

					if (lastTwo === '!!') {
						moveToTag.san = moveToTag.san.slice(0, -2) + '!';
					} else if (lastTwo === '!?') {
						moveToTag.san = moveToTag.san.slice(0, -2) + '?!';
					} else if (lastTwo === '?!') {
						moveToTag.san = moveToTag.san.slice(0, -2) + '?';
					} else if (lastTwo === '??') {
						moveToTag.san = moveToTag.san.slice(0, -2);
					} else if (lastTwo.charAt(1) === '!') {
						moveToTag.san = moveToTag.san.slice(0, -1) + '!?';
					} else if (lastTwo.charAt(1) === '?') {
						moveToTag.san = moveToTag.san.slice(0, -1) + '??';
					} else {
						moveToTag.san = moveToTag.san + '!!';
					}

					return draft;
				}
				case 'ADD_MOVE_TO_HISTORY': {
					const newMove = action.move;

					const moves = draft.study.moves;
					const currentMoveId = draft.currentMove?.moveId;

					const currentMoveIndex = moves.findIndex(
						(move) => move.moveId === currentMoveId
					);

					const { variant, moveIndex } = findMoveIndex(moves, currentMoveId);
					const moveId = nanoid();

					if (variant) {
						//handle variant
						const parent = moves[variant.parentMoveIndex];
						const variantMoves = parent.variants[variant.variantIndex].moves;

						const isLastMove = moveIndex === variantMoves.length - 1;

						//Only push if its the last move in the variant because depth can only be 1
						if (isLastMove) {
							const move = {
								...newMove,
								moveId: moveId,
								shapes: [],
								comment: null,
							};
							variantMoves.push(move);

							const tempChess = new Chess(newMove.after);

							draft.currentMove = move;

							chessView?.set({
								fen: newMove.after,
								check: tempChess.isCheck(),
							});
						} else {
							let altLine = parent.variants[variant.variantIndex].moves
								.slice(0, moveIndex + 1)
								.map((move) => {
									return {
										...move,
										moveId: nanoid(),
									};
								});

							const move = {
								...newMove,
								moveId: moveId,
								shapes: [],
								comment: null,
							};

							altLine.push(move);

							parent.variants.push({
								parentMoveId: parent.moveId,
								variantId: nanoid(),
								moves: altLine,
							});

							const tempChess = new Chess(newMove.after);

							draft.currentMove = move;

							chessView?.set({
								fen: newMove.after,
								check: tempChess.isCheck(),
							});
						}
					} else {
						//handle main line
						const isLastMove = currentMoveIndex === moves.length - 1;

						if (isLastMove) {
							const move = {
								...newMove,
								moveId: moveId,
								variants: [],
								shapes: [],
								comment: null,
							};
							moves.push(move);

							draft.currentMove = move;
						} else {
							const currentMove = moves[moveIndex];

							// check if the next move is the same move
							const nextMove = moves[moveIndex + 1];

							if (nextMove.san === newMove.san) {
								draft.currentMove = nextMove;
								return draft;
							}

							const move = {
								...newMove,
								moveId: moveId,
								shapes: [],
								comment: null,
							};

							currentMove.variants.push({
								parentMoveId: currentMove.moveId,
								variantId: nanoid(),
								moves: [move],
							});

							draft.currentMove = move;
						}
					}

					return draft;
				}
				default:
					break;
			}
		},
		{
			currentMove: (chessStudyData.currentMove)
				? chessStudyData.currentMove
				: {
					moveId: 'root',
					variants: [],
					shapes: [],
					comment: null,
				},
			isViewOnly: false,
			study: chessStudyData,
		}
	);

	const onCopyButtonClick = useCallback(async (pgn_or_fen: 'pgn' | 'fen') => {
		if (pgn_or_fen === 'fen') {
			try {
				navigator.clipboard.writeText(chessLogic.fen())
				new Notice('FEN copied to clipboard!');
			} catch (e) {
				new Notice('Could not copy to clipboard:', e);
			}
		} else if (pgn_or_fen === 'pgn') {
			let movesStr = '';
			if (gameState.study.moves && gameState.study.moves.length > 0) {
				const startIndex = (gameState.study.moves[0].moveId === 'root' ? 1 : 0) + (firstPlayer === 'b' ? 1 : 0);
				if (firstPlayer === 'b') {
					movesStr += `${initialMoveNumber}... ${gameState.study.moves[startIndex - 1].san}`;
				}
				gameState.study.moves
					.slice(startIndex)
					.forEach((move, index) => {
						const moveNumber = initialMoveNumber + (firstPlayer === 'b' ? 1 : 0) + Math.floor(index / 2);
						movesStr += (index % 2 === 0)
							? ` ${moveNumber}. ${move.san}`
							: ` ${move.san}`;
						if (move.variants && move.variants.length > 0) {
							movesStr += ' (';
							move.variants.forEach((variant) => {
								if (!variant.moves || variant.moves.length === 0) return;
								const bVariant = index % 2 === 0;
								if (bVariant) movesStr += `${moveNumber}... ${variant.moves[0].san}`;
								variant.moves
									.slice((bVariant ? 1 : 0))
									.forEach((variantMove, variantIndex) => {
										const variantMoveNumber = moveNumber + 1 + Math.floor(variantIndex / 2);
										movesStr += (variantIndex % 2 === 0)
											? ` ${variantMoveNumber}. ${variantMove.san}`
											: ` ${variantMove.san}`;
									});
							});
							movesStr += ')';
						}
					});
			}
			try {
				navigator.clipboard.writeText(movesStr.trim());
				new Notice('PGN copied to clipboard!');
			} catch (e) {
				new Notice('Could not copy to clipboard:', e);
			}
		}
	}, [chessLogic, firstPlayer, gameState.study.moves, initialMoveNumber])

	const onSaveButtonClick = useCallback(async () => {
		try {
			const saveData = {
				...gameState.study,
				currentMove: gameState.currentMove as ChessStudyMove | null,
			};
			await dataAdapter.saveFile(saveData, chessStudyId);
			new Notice('Save successfull!');
		} catch (e) {
			new Notice('Something went wrong during saving:', e);
		}
	}, [chessStudyId, dataAdapter, gameState]);

	return (
		<div className="chess-study">
			<div className="chessground-pgn-container">
				<div className="chessground-container">
					<ChessgroundWrapper
						api={chessView}
						setApi={setChessView}
						config={{
							orientation: boardOrientation,
						}}
						boardColor={boardColor}
						chess={chessLogic}
						addMoveToHistory={(move: Move) =>
							dispatch({ type: 'ADD_MOVE_TO_HISTORY', move })
						}
						isViewOnly={gameState.isViewOnly}
						syncShapes={(shapes: DrawShape[]) =>
							dispatch({ type: 'SYNC_SHAPES', shapes })
						}
						shapes={gameState.currentMove?.shapes}
					/>
				</div>
				{viewMoves && (
					<div className="pgn-container">
						<PgnViewer
							history={
								(gameState.study.moves.length > 0
										&& gameState.study.moves[0].moveId === 'root')
									? gameState.study.moves.slice(1)
									: gameState.study.moves
							}
							currentMoveId={gameState.currentMove?.moveId}
							firstPlayer={firstPlayer}
							initialMoveNumber={initialMoveNumber}
							onTagButtonClick={() =>
								dispatch({ type: 'TAG_CURRENT_MOVE' })
							}
							onResetButtonClick={() =>
								dispatch({ type: 'DISPLAY_INITIAL_BOARD' })
							}
							onBackButtonClick={() =>
								dispatch({ type: 'DISPLAY_PREVIOUS_MOVE_IN_HISTORY' })
							}
							onForwardButtonClick={() =>
								dispatch({ type: 'DISPLAY_NEXT_MOVE_IN_HISTORY' })
							}
							onMoveItemClick={(moveId: string) =>
								dispatch({
									type: 'DISPLAY_SELECTED_MOVE_IN_HISTORY',
									moveId: moveId,
								})
							}
							onUndoButtonClick={() =>
								dispatch({ type: 'REMOVE_LAST_MOVE_FROM_HISTORY' })
							}
							onSaveButtonClick={onSaveButtonClick}
							onPgnCopyButtonClick={() => {
								onCopyButtonClick('pgn');
							}}
							onFenCopyButtonClick={() => {
								onCopyButtonClick('fen');
							}}
						/>
					</div>
				)}
			</div>
			{viewComments && (
				<div className="CommentSection">
					<CommentSection
						currentComment={gameState.currentMove?.comment}
						setComments={(comment: JSONContent) =>
							dispatch({ type: 'SYNC_COMMENT', comment: comment })
						}
					/>
				</div>
			)}
		</div>
	);
};
