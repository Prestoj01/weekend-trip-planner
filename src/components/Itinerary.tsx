import {
  closestCenter,
  type CollisionDetection,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  rectIntersection,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Car, Footprints, GripVertical, Pencil } from 'lucide-react';
import { Fragment, useState } from 'react';
import { formatDay, formatTime } from '../lib/dates';
import { formatDistance } from '../lib/geo';
import { CATEGORY_LABELS } from '../lib/labels';
import { newId } from '../lib/storage';
import { estimateLeg, formatDuration } from '../lib/travel';
import { DAY_COLORS, formatMoney, moveActivity, sortActivities } from '../lib/trip';
import { describeWeather, formatTemp } from '../lib/weather';
import type { Activity, DailyWeather, TempUnit } from '../types';
import { ActivityForm } from './ActivityForm';
import { CategoryIcon, ICON_STROKE, WeatherIcon } from './icons';
import { useToast } from './Toast';

interface Props {
  /** Number the first shown day as day `dayOffset + 1` (for previews of later days). */
  dayOffset?: number;
  days: string[];
  activities: Activity[];
  forecast: DailyWeather[];
  unit: TempUnit;
  onChange?: (activities: Activity[]) => void;
  /** Omit to render map pins as static labels (e.g. in a preview). */
  onFocus?: (a: Activity) => void;
  /** Put a removed activity back (Undo). */
  onRestore?: (a: Activity) => void;
  /** Activities added elsewhere (suggestions, the planner) to drop in, staggered in this order. */
  highlightIds?: string[];
}

type Editing = { mode: 'new'; date: string } | { mode: 'edit'; id: string } | null;

const DAY_PREFIX = 'day:';

export function Itinerary({
  days,
  activities,
  forecast,
  unit,
  onChange,
  onFocus,
  highlightIds = [],
  onRestore,
  dayOffset = 0,
}: Props) {
  const [editing, setEditing] = useState<Editing>(null);
  const [touchedId, setTouchedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const toast = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const add = (a: Omit<Activity, 'id'>) => {
    const id = newId();
    onChange?.([...activities, { ...a, id }]);
    setTouchedId(id);
    setEditing(null);
  };
  const save = (id: string, a: Omit<Activity, 'id'>) => {
    onChange?.(activities.map((x) => (x.id === id ? { ...a, id } : x)));
    setTouchedId(id);
    setEditing(null);
  };
  const remove = (id: string) => {
    const removed = activities.find((x) => x.id === id);
    onChange?.(activities.filter((x) => x.id !== id));
    setEditing(null);
    if (removed && onRestore)
      toast(`Removed “${removed.title}”`, { action: { label: 'Undo', run: () => onRestore(removed) } });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggingId(null);
    if (!over || !onChange) return;
    const overId = String(over.id);
    const target = overId.startsWith(DAY_PREFIX)
      ? ({ kind: 'day', date: overId.slice(DAY_PREFIX.length) } as const)
      : ({ kind: 'activity', id: overId } as const);
    const next = moveActivity(activities, String(active.id), target);
    if (next !== activities) {
      onChange(next);
      setTouchedId(String(active.id));
    }
  };

  const dragging = activities.find((a) => a.id === draggingId);

  // Two-step collision: which day is the dragged stop over, then which stop within that day.
  // Keeps keyboard moves on neighbouring stops instead of snapping to the whole day container.
  const collisionDetection: CollisionDetection = (args) => {
    const isDay = (id: unknown) => String(id).startsWith(DAY_PREFIX);
    const dayHits = rectIntersection({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) => isDay(c.id)),
    });
    const dayId = dayHits[0]?.id;
    if (!dayId) return closestCenter(args);
    const date = String(dayId).slice(DAY_PREFIX.length);
    const inDay = args.droppableContainers.filter(
      (c) => !isDay(c.id) && activities.find((a) => a.id === c.id)?.date === date,
    );
    return inDay.length ? closestCenter({ ...args, droppableContainers: inDay }) : dayHits;
  };

  const body = (
    <div className="itinerary">
      {days.map((date, dayIndex) => {
        const { weekday, label } = formatDay(date);
        const items = sortActivities(activities.filter((a) => a.date === date));
        const wx = forecast.find((f) => f.date === date);
        const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
        let pin = 0;

        return (
          <DayTicket key={date} date={date} color={color} droppable={!!onChange}>
            <div className="stub" aria-hidden>
              <span className="stub-label">Day</span>
              <span className="stub-num">{String(dayIndex + 1 + dayOffset).padStart(2, '0')}</span>
              <span className="stub-label">{weekday.slice(0, 3)}</span>
            </div>
            <div className="day-body">
              <header className="day-head">
                <div>
                  <h3>{weekday}</h3>
                  <span className="muted">{label}</span>
                </div>
                {wx && (
                  <div className="day-wx" title={describeWeather(wx.code).label}>
                    <WeatherIcon kind={describeWeather(wx.code).kind} size={18} />
                    <span>
                      {formatTemp(wx.maxC, unit)} / <span className="muted">{formatTemp(wx.minC, unit)}</span>
                    </span>
                  </div>
                )}
              </header>

              {items.length === 0 && editing?.mode !== 'new' && (
                <p className="empty">{onChange ? 'Nothing planned yet — drag a stop here.' : 'Nothing planned yet.'}</p>
              )}

              <SortableContext items={items.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                <ol className="activities">
                  {items.map((a, i) => {
                    if (a.location) pin += 1;
                    const prev = items[i - 1];
                    const leg = prev?.location && a.location ? estimateLeg(prev.location, a.location) : null;
                    return (
                      <Fragment key={a.id}>
                        {leg && (
                          <li className="leg">
                            {leg.mode === 'walk' ? (
                              <Footprints size={14} strokeWidth={ICON_STROKE} aria-hidden />
                            ) : (
                              <Car size={14} strokeWidth={ICON_STROKE} aria-hidden />
                            )}
                            <span>
                              ~{formatDuration(leg.minutes)} {leg.mode === 'walk' ? 'walk' : 'drive'} ·{' '}
                              {formatDistance(leg.km)}
                            </span>
                          </li>
                        )}
                        {editing?.mode === 'edit' && editing.id === a.id ? (
                          <li>
                            <ActivityForm
                              initial={a}
                              date={date}
                              days={days}
                              onSave={(v) => save(a.id, v)}
                              onCancel={() => setEditing(null)}
                              onDelete={() => remove(a.id)}
                            />
                          </li>
                        ) : (
                          <ActivityRow
                            activity={a}
                            pin={a.location ? pin : null}
                            editable={!!onChange}
                            flash={a.id === touchedId || highlightIds.includes(a.id)}
                            flashDelay={Math.max(0, highlightIds.indexOf(a.id)) * 110}
                            onFocus={onFocus}
                            onEdit={() => setEditing({ mode: 'edit', id: a.id })}
                          />
                        )}
                      </Fragment>
                    );
                  })}
                </ol>
              </SortableContext>

              {onChange &&
                (editing?.mode === 'new' && editing.date === date ? (
                  <ActivityForm date={date} days={days} onSave={add} onCancel={() => setEditing(null)} />
                ) : (
                  <button className="btn ghost small add-btn" onClick={() => setEditing({ mode: 'new', date })}>
                    + Add activity
                  </button>
                ))}
            </div>
          </DayTicket>
        );
      })}
    </div>
  );

  if (!onChange) return body;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={({ active }) => setDraggingId(String(active.id))}
      onDragCancel={() => setDraggingId(null)}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            'To move a stop, press space or enter to pick it up, use the arrow keys to move it, and press space or enter again to drop it. Press escape to cancel.',
        },
      }}
    >
      {body}
      <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
        {dragging && (
          <div className="drag-ticket">
            <CategoryIcon category={dragging.category} />
            <strong>{dragging.title}</strong>
            {dragging.time && <span className="muted">{formatTime(dragging.time)}</span>}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function DayTicket({
  date,
  color,
  droppable,
  children,
}: {
  date: string;
  color: string;
  droppable: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${DAY_PREFIX}${date}`, disabled: !droppable });
  return (
    <section
      ref={setNodeRef}
      className={`card day ticket${isOver ? ' drop-target' : ''}`}
      style={{ '--day-color': color } as React.CSSProperties}
    >
      {children}
    </section>
  );
}

function ActivityRow({
  activity: a,
  pin,
  editable,
  flash,
  flashDelay,
  onFocus,
  onEdit,
}: {
  activity: Activity;
  pin: number | null;
  editable: boolean;
  flash: boolean;
  flashDelay: number;
  onFocus?: (a: Activity) => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: a.id,
    disabled: !editable,
  });

  return (
    <li
      ref={setNodeRef}
      className={`activity${flash ? ' just-changed' : ''}${isDragging ? ' is-dragging' : ''}`}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        animationDelay: flash && flashDelay ? `${flashDelay}ms` : undefined,
      }}
    >
      <span className="activity-time">
        {editable && (
          <button
            ref={setActivatorNodeRef}
            className="drag-handle"
            aria-label={`Move ${a.title}`}
            title="Drag to move"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={15} strokeWidth={ICON_STROKE} aria-hidden />
          </button>
        )}
        {a.time && formatTime(a.time)}
      </span>
      <div className="activity-body">
        <div className="activity-title">
          <CategoryIcon category={a.category} className="cat-icon" aria-label={CATEGORY_LABELS[a.category]} />
          <strong>{a.title}</strong>
          {pin !== null && !onFocus && <span className="pin">{pin}</span>}
          {pin !== null && onFocus && (
            <button
              className="pin"
              onClick={() => onFocus(a)}
              title="Show on map"
              aria-label={`Show ${a.title} on map`}
            >
              {pin}
            </button>
          )}
        </div>
        {a.notes && <p className="activity-notes">{a.notes}</p>}
      </div>
      {a.cost !== undefined && <span className="activity-cost">{formatMoney(a.cost)}</span>}
      {editable && (
        <button className="icon-btn" onClick={onEdit} aria-label={`Edit ${a.title}`} title="Edit">
          <Pencil size={15} strokeWidth={ICON_STROKE} aria-hidden />
        </button>
      )}
    </li>
  );
}
