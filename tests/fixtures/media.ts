export const mediaFileTokenFixture = "boxcnimage";

export const mediaAttachmentFixture = {
  file_token: mediaFileTokenFixture,
  name: "bug.png",
  size: 123,
  tmp_url:
    "https://open.larksuite.com/open-apis/drive/v1/medias/batch_get_tmp_download_url?file_tokens=boxcnimage",
  type: "image/png",
  url: "https://open.larksuite.com/open-apis/drive/v1/medias/boxcnimage/download",
};

export const mediaImageFieldFixture = [mediaAttachmentFixture];

export const anonymousMediaUnauthorizedFixture = {
  code: 99991663,
  msg: "Access token is required.",
};
