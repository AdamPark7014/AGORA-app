import SwiftUI

/// Posts guardados — paridad con `GuardadosScreen.kt` (`GET /guardados`).
struct GuardadosView: View {
    var onPostTap: (String) -> Void = { _ in }
    var onAuthorTap: (String) -> Void = { _ in }
    var onHashtagTap: (String) -> Void = { _ in }

    @State private var posts: [PostDto] = []
    @State private var cursor: String?
    @State private var cargando = true
    @State private var cargandoMas = false
    @State private var error: String?

    var body: some View {
        Group {
            if cargando && posts.isEmpty {
                AgoraFeedSkeleton()
            } else if let error, posts.isEmpty {
                AgoraErrorState(message: error) {
                    Task { await cargar(desde: nil, reemplazar: true) }
                }
            } else if posts.isEmpty {
                AgoraEmptyState(
                    emoji: "🔖",
                    title: AgoraCopy.guardadosEmptyTitle,
                    subtitle: AgoraCopy.guardadosEmptySubtitle
                )
            } else {
                List {
                    ForEach(posts) { post in
                        PostCardView(
                            post: post,
                            onTap: { onPostTap(post.id) },
                            onAuthorTap: post.autor?.handle.map { handle in
                                { onAuthorTap(handle) }
                            },
                            onHashtagTap: onHashtagTap
                        )
                        .listRowInsets(EdgeInsets(
                            top: AgoraDesign.Spacing.xxs,
                            leading: AgoraDesign.Spacing.sm,
                            bottom: AgoraDesign.Spacing.xxs,
                            trailing: AgoraDesign.Spacing.sm
                        ))
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                        .onAppear {
                            if post.id == posts.last?.id {
                                Task { await cargarMas() }
                            }
                        }
                    }
                    if cargandoMas {
                        HStack {
                            Spacer()
                            ProgressView()
                            Spacer()
                        }
                        .listRowBackground(Color.clear)
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("Guardados")
        .refreshable { await cargar(desde: nil, reemplazar: true) }
        .task { await cargar(desde: nil, reemplazar: true) }
    }

    private func cargar(desde: String?, reemplazar: Bool) async {
        if reemplazar {
            cargando = true
        } else {
            guard cursor != nil, !cargandoMas else { return }
            cargandoMas = true
        }
        error = nil
        defer {
            cargando = false
            cargandoMas = false
        }
        do {
            let resp = try await AgoraApi.guardados(cursor: desde)
            let nuevos = resp.publicaciones ?? []
            posts = reemplazar ? nuevos : posts + nuevos
            cursor = resp.siguienteCursor
        } catch {
            if reemplazar {
                self.error = FormatUtils.mensajeDe(error)
                posts = []
            }
        }
    }

    private func cargarMas() async {
        guard let cursor, !cargando, !cargandoMas else { return }
        await cargar(desde: cursor, reemplazar: false)
    }
}
