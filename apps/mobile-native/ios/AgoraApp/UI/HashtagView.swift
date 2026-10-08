import SwiftUI

/// Publicaciones por hashtag — paridad con `HashtagScreen.kt`.
struct HashtagView: View {
    let tag: String
    var onPostTap: (String) -> Void = { _ in }
    var onHashtagTap: (String) -> Void = { _ in }
    var onAuthorTap: (String) -> Void = { _ in }

    @State private var publicaciones: [PostDto] = []
    @State private var cursor: String?
    @State private var cargando = true
    @State private var cargandoMas = false

    var body: some View {
        Group {
            if cargando && publicaciones.isEmpty {
                AgoraFeedSkeleton()
            } else {
                List {
                    Section {
                        Text("#\(tag)")
                            .font(.title2.bold())
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                    }

                    if publicaciones.isEmpty {
                        AgoraEmptyState(
                            emoji: "✨",
                            title: AgoraCopy.hashtagEmptyTitle,
                            subtitle: AgoraCopy.hashtagEmptySubtitle
                        )
                        .listRowBackground(Color.clear)
                    } else {
                        ForEach(publicaciones) { post in
                            PostCardView(
                                post: post,
                                onTap: { onPostTap(post.id) },
                                onAuthorTap: post.autor?.handle.map { handle in
                                    { onAuthorTap(handle) }
                                },
                                onHashtagTap: onHashtagTap,
                                onMencionTap: onAuthorTap
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
                                if post.id == publicaciones.last?.id {
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
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
        }
        .background(AgoraDesign.Colors.fondo)
        .navigationTitle("#\(tag)")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await cargar(desde: nil, reemplazar: true) }
        .task(id: tag) { await cargar(desde: nil, reemplazar: true) }
    }

    private func cargar(desde: String?, reemplazar: Bool) async {
        if reemplazar {
            cargando = true
            publicaciones = []
            cursor = nil
        } else {
            guard cursor != nil, !cargandoMas else { return }
            cargandoMas = true
        }
        defer {
            cargando = false
            cargandoMas = false
        }
        do {
            let datos = try await AgoraApi.publicacionesHashtag(tag: tag, cursor: desde)
            let nuevos = datos.publicaciones ?? []
            publicaciones = reemplazar ? nuevos : publicaciones + nuevos
            cursor = datos.siguienteCursor
        } catch {
            if reemplazar {
                publicaciones = []
            }
        }
    }

    private func cargarMas() async {
        guard let cursor, !cargando, !cargandoMas else { return }
        await cargar(desde: cursor, reemplazar: false)
    }
}
