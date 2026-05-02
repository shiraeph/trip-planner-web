import { useState } from "react";
import type { TripPlanResponse } from "../features/tripPlanner/types/tripTypes";
import TripForm from "../features/tripPlanner/components/TripForm";


function ItineraryView({ trip }: { trip: TripPlanResponse }) {
  const days = trip.itinerary?.dayPlans ?? [];
  if (days.length === 0) return null;

  return (
    <div className="mt-6 space-y-4">
      {days.map((day) => (
        <div key={day.date} className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-semibold text-gray-900">
              {day.title}
            </div>
            <div className="text-sm text-gray-500">{day.date}</div>
          </div>

          <div className="mt-4 space-y-4">
            {day.blocks.map((block, i) => (
              <div key={i}>
                <div className="text-xs font-semibold tracking-wide text-gray-600">
                  {block.timeBlock}
                </div>

                <div className="mt-2 space-y-2">
                  {block.items.map((item, j) => (
                    <div
                      key={j}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-800 border border-gray-200">
                          {item.type}
                        </span>
                        <div className="text-sm font-medium text-gray-900">
                          {item.name}
                        </div>
                        {item.location?.name ? (
                          <div className="text-sm text-gray-500">
                            · {item.location.name}
                          </div>
                        ) : null}
                      </div>

                      {item.notes ? (
                        <div className="mt-1 text-sm text-gray-600">
                          {item.notes}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusPills({ trip }: { trip: TripPlanResponse }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
        Status: <b>{trip.tripStatus}</b>
      </span>

      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
        {trip.destination} · {trip.startDate} → {trip.endDate}
      </span>

      {trip.id ? (
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
          ID: <b>{trip.id}</b>
        </span>
      ) : null}
    </div>
  );
}

export default function App() {
  const [trip, setTrip] = useState<TripPlanResponse | null>(null);
  const [statusText, setStatusText] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Travel Planner
          </h1>
          <p className="mt-2 text-gray-600">
            Enter your preferences and generate a day-by-day itinerary.
          </p>
        </header>

        <TripForm onResult={setTrip} onStatus={setStatusText} />

        {statusText ? (
          <div className="mt-4 text-center text-sm text-gray-600">
            {statusText}
          </div>
        ) : null}

        {trip ? (
          <section className="mt-8">
            <StatusPills trip={trip} />

            {trip.tripStatus === "FAILED" ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
                {trip.errorMessage ?? "Generation failed"}
              </div>
            ) : trip.tripStatus === "GENERATING" ? (
              <div className="mt-4 rounded-2xl border bg-white p-4 text-gray-700">
                Generating… (refresh will update once it’s ready)
              </div>
            ) : (
              <ItineraryView trip={trip} />
            )}

            <details className="mt-6">
              <summary className="cursor-pointer text-sm text-gray-600">
                Raw response
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-2xl border bg-white p-4 text-xs text-gray-700">
                {JSON.stringify(trip, null, 2)}
              </pre>
            </details>
          </section>
        ) : null}
      </div>
    </div>
  );
}
